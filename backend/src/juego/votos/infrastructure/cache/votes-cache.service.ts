import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../../../core/database/redis/redis.service';
import { MemoryCacheStore } from '../../../../core/cache/memory-cache.store';

@Injectable()
export class VotesCacheService {
  private readonly logger = new Logger(VotesCacheService.name);
  private readonly votesMemory = new MemoryCacheStore<Map<number, number>>();
  private readonly distMemory = new MemoryCacheStore<Map<number, number>>();

  constructor(private readonly redisService: RedisService) {}

  private voteKey(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}`;
  }

  private distKey(rondaId: number, preguntaId: number): string {
    return `dist:${rondaId}:${preguntaId}`;
  }

  private procPrefix(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing:`;
  }

  async setVote(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    const vk = this.voteKey(rondaId, preguntaId);
    const dk = this.distKey(rondaId, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const prevStr = await client.hget(vk, String(participanteId));
        const prevOpcionId = prevStr !== null ? parseInt(prevStr, 10) : null;

        await client.hset(vk, String(participanteId), String(opcionId));
        await client.expire(vk, 3600);

        if (prevOpcionId === null) {
          await client.hincrby(dk, String(opcionId), 1);
          await client.expire(dk, 3600);
        } else if (prevOpcionId !== opcionId) {
          await client.hincrby(dk, String(prevOpcionId), -1);
          await client.hincrby(dk, String(opcionId), 1);
          await client.expire(dk, 3600);
        }
        return;
      } catch (e) {
        this.logger.warn(`[VOTES:CACHE] Fallo setVote Redis: ${e}`);
      }
    }

    const votes = this.votesMemory.get(vk) ?? new Map<number, number>();
    const prevOpcion = votes.get(participanteId);
    votes.set(participanteId, opcionId);
    this.votesMemory.set(vk, votes, 3_600_000);

    const dist = this.distMemory.get(dk) ?? new Map<number, number>();
    if (prevOpcion === undefined) {
      dist.set(opcionId, (dist.get(opcionId) ?? 0) + 1);
    } else if (prevOpcion !== opcionId) {
      dist.set(prevOpcion, Math.max(0, (dist.get(prevOpcion) ?? 0) - 1));
      dist.set(opcionId, (dist.get(opcionId) ?? 0) + 1);
    }
    this.distMemory.set(dk, dist, 3_600_000);
  }

  async getDistribution(
    rondaId: number,
    preguntaId: number,
  ): Promise<Map<number, number>> {
    const dk = this.distKey(rondaId, preguntaId);
    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.hgetall(dk);
        const result = new Map<number, number>();
        for (const [oid, count] of Object.entries(data)) {
          result.set(parseInt(oid, 10), parseInt(count, 10));
        }
        return result;
      } catch {
        /* fallback */
      }
    }
    return new Map(this.distMemory.get(dk) ?? []);
  }

  async getVotes(
    rondaId: number,
    preguntaId: number,
  ): Promise<{ participanteId: number; opcionId: number }[]> {
    const vk = this.voteKey(rondaId, preguntaId);
    const votesMap = new Map<number, number>();

    const memVotes = this.votesMemory.get(vk);
    if (memVotes) for (const [pId, oId] of memVotes) votesMap.set(pId, oId);

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.hgetall(vk);
        for (const [pId, oId] of Object.entries(data)) {
          votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
        }
      } catch {
        /* fallback */
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
    const originalKey = this.voteKey(rondaId, preguntaId);
    const uniqueProcKey = `${this.procPrefix(rondaId, preguntaId)}${randomUUID()}`;
    const votesMap = new Map<number, number>();

    const procPrefix = this.procPrefix(rondaId, preguntaId);
    for (const [key, voteMap] of this.votesMemory.entries()) {
      if (key.startsWith(procPrefix) || key === originalKey) {
        for (const [pId, oId] of voteMap.entries()) {
          votesMap.set(pId, oId);
        }
        this.votesMemory.delete(key);
      }
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const pattern = `votes:${rondaId}:${preguntaId}:processing:*`;
        const orphanKeys = await client.keys(pattern);
        for (const ok of orphanKeys) {
          const raw = await client.hgetall(ok);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
          await client.del(ok);
        }

        const tx = client.multi();
        tx.exists(originalKey);
        tx.rename(originalKey, uniqueProcKey);
        const results = await tx.exec();
        if (results?.[0]?.[1] === 1) {
          const raw = await client.hgetall(uniqueProcKey);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
        }
      } catch {
        /* fallback */
      }
    }

    const finalVotes = Array.from(votesMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
    if (finalVotes.length > 0) {
      const map = new Map<number, number>();
      for (const v of finalVotes) map.set(v.participanteId, v.opcionId);
      this.votesMemory.set(uniqueProcKey, map, 3_600_000);
    }
    return { processingKey: uniqueProcKey, votes: finalVotes };
  }

  async commitVotes(processingKey: string): Promise<void> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(processingKey);
      } catch {
        /* ignore */
      }
    }
    this.votesMemory.delete(processingKey);
  }

  async rollbackVotes(
    processingKey: string,
    rondaId: number,
    preguntaId: number,
  ): Promise<void> {
    const originalKey = this.voteKey(rondaId, preguntaId);

    const procVotes = this.votesMemory.get(processingKey);
    if (procVotes) {
      const original =
        this.votesMemory.get(originalKey) ?? new Map<number, number>();
      for (const [pId, oId] of procVotes) original.set(pId, oId);
      this.votesMemory.set(originalKey, original, 3_600_000);
      this.votesMemory.delete(processingKey);
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const procData = await client.hgetall(processingKey);
        if (Object.keys(procData).length > 0) {
          const tx = client.multi();
          for (const [pId, oId] of Object.entries(procData))
            tx.hset(originalKey, pId, oId);
          tx.expire(originalKey, 3600);
          tx.del(processingKey);
          await tx.exec();
        }
      } catch {
        /* fallback */
      }
    }
  }

  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const vk = this.voteKey(rondaId, preguntaId);
    const dk = this.distKey(rondaId, preguntaId);
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(vk);
        await client.del(dk);
      } catch {
        /* fallback */
      }
    }
    this.votesMemory.delete(vk);
    this.distMemory.delete(dk);
  }
}
