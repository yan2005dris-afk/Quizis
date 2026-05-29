import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface MemoryCacheEntry {
  votes: Map<number, number>;
  expiresAt: number;
}

interface MemoryDistEntry {
  counts: Map<number, number>;
  expiresAt: number;
}

@Injectable()
export class VotesCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VotesCacheUseCase.name);
  private memoryVotes = new Map<string, MemoryCacheEntry>();
  private memoryDist = new Map<string, MemoryDistEntry>();
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
  }

  private runMemoryGC() {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.memoryVotes.entries()) {
      if (entry.expiresAt < now) {
        this.memoryVotes.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this.memoryDist.entries()) {
      if (entry.expiresAt < now) {
        this.memoryDist.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(
        `[CACHE:GC] Recolector de basura liberó ${count} claves en memoria expiradas.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.gcInterval) clearInterval(this.gcInterval);
  }

  private getVoteKey(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}`;
  }

  private getProcessingPattern(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing:*`;
  }

  private getProcessingPrefix(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing:`;
  }

  async setVote(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    const distKey = `dist:${rondaId}:${preguntaId}`;
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.hset(key, participanteId.toString(), opcionId.toString());
        await client.expire(key, 3600);
        await client.hincrby(distKey, opcionId.toString(), 1);
        await client.expire(distKey, 3600);
        return;
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo al setear voto en Redis: ${error}`,
        );
      }
    }

    let entry = this.memoryVotes.get(key);
    if (!entry) {
      entry = {
        votes: new Map<number, number>(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      this.memoryVotes.set(key, entry);
    }
    entry.votes.set(participanteId, opcionId);

    let distEntry = this.memoryDist.get(distKey);
    if (!distEntry) {
      distEntry = {
        counts: new Map<number, number>(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      this.memoryDist.set(distKey, distEntry);
    }
    distEntry.counts.set(opcionId, (distEntry.counts.get(opcionId) ?? 0) + 1);
  }

  async getDistribution(
    rondaId: number,
    preguntaId: number,
  ): Promise<Map<number, number>> {
    const distKey = `dist:${rondaId}:${preguntaId}`;
    const client = this.redisService.getClient();

    if (client) {
      try {
        const data = await client.hgetall(distKey);
        const result = new Map<number, number>();
        for (const [opcionId, countStr] of Object.entries(data)) {
          result.set(parseInt(opcionId, 10), parseInt(countStr, 10));
        }
        return result;
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo al obtener distribución de Redis: ${error}`,
        );
      }
    }

    const memEntry = this.memoryDist.get(distKey);
    return new Map(memEntry?.counts ?? []);
  }

  async getVotes(
    rondaId: number,
    preguntaId: number,
  ): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    const votesMap = new Map<number, number>();

    const memEntry = this.memoryVotes.get(key);
    if (memEntry) {
      for (const [pId, oId] of memEntry.votes.entries()) {
        votesMap.set(pId, oId);
      }
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.hgetall(key);
        for (const [pId, oId] of Object.entries(data)) {
          votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
        }
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo al obtener votos de Redis: ${error}`,
        );
      }
    }

    return Array.from(votesMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
  }

  async prepareVotesForPersist(
    rondaId: number,
    preguntaId: number,
  ): Promise<{
    processingKey: string;
    votes: { participanteId: number; opcionId: number }[];
  }> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);
    const uniqueProcKey = `${this.getProcessingPrefix(rondaId, preguntaId)}${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const votesMap = new Map<number, number>();

    const procPrefix = this.getProcessingPrefix(rondaId, preguntaId);
    for (const [memKey, entry] of this.memoryVotes.entries()) {
      if (memKey.startsWith(procPrefix) || memKey === originalKey) {
        for (const [pId, oId] of entry.votes.entries()) {
          votesMap.set(pId, oId);
        }
        this.memoryVotes.delete(memKey);
      }
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const pattern = this.getProcessingPattern(rondaId, preguntaId);
        const orphanKeys = await client.keys(pattern);

        for (const orphanKey of orphanKeys) {
          const raw = await client.hgetall(orphanKey);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
          await client.del(orphanKey);
        }

        const tx = client.multi();
        tx.exists(originalKey);
        tx.rename(originalKey, uniqueProcKey);

        const results = await tx.exec();
        if (results && results[0] && results[0][1] === 1) {
          const raw = await client.hgetall(uniqueProcKey);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
        }
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo en persistencia atómica Redis: ${error}`,
        );
      }
    }

    // Si recolectamos votos en total
    const finalVotes = Array.from(votesMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));

    if (finalVotes.length > 0) {
      const map = new Map<number, number>();
      for (const v of finalVotes) {
        map.set(v.participanteId, v.opcionId);
      }
      this.memoryVotes.set(uniqueProcKey, {
        votes: map,
        expiresAt: Date.now() + 3600 * 1000,
      });
    }

    return { processingKey: uniqueProcKey, votes: finalVotes };
  }

  async commitVotes(processingKey: string): Promise<void> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(processingKey);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo commit Redis: ${error}`);
      }
    }
    this.memoryVotes.delete(processingKey);
  }

  /**
   * FASE 2: Rollback por Fallo en Base de Datos.
   * Restaura los votos de vuelta al key principal con EXPIRE para asegurar TTL.
   */
  async rollbackVotes(
    processingKey: string,
    rondaId: number,
    preguntaId: number,
  ): Promise<void> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);

    // Rollback en memoria
    const procEntry = this.memoryVotes.get(processingKey);
    if (procEntry) {
      let originalEntry = this.memoryVotes.get(originalKey);
      if (!originalEntry) {
        originalEntry = {
          votes: new Map<number, number>(),
          expiresAt: Date.now() + 3600 * 1000,
        };
        this.memoryVotes.set(originalKey, originalEntry);
      }
      for (const [pId, oId] of procEntry.votes.entries()) {
        originalEntry.votes.set(pId, oId);
      }
      this.memoryVotes.delete(processingKey);
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const procData = await client.hgetall(processingKey);
        if (Object.keys(procData).length > 0) {
          const tx = client.multi();
          for (const [pId, oId] of Object.entries(procData)) {
            tx.hset(originalKey, pId, oId);
          }
          // Asegurar el TTL en la clave de retorno original
          tx.expire(originalKey, 3600);
          tx.del(processingKey);
          await tx.exec();
        }
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo rollback Redis: ${error}`);
      }
    }
  }

  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    const distKey = `dist:${rondaId}:${preguntaId}`;
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(key);
        await client.del(distKey);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo limpieza Redis: ${error}`);
      }
    }
    this.memoryVotes.delete(key);
    this.memoryDist.delete(distKey);
  }
}
