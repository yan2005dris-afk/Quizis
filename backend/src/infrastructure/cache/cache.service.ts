import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../database/redis/redis.service';

interface MemoryCacheEntry {
  votes: Map<number, number>;
  expiresAt: number;
}

interface MemoryOnlineEntry {
  participants: Set<string>;
  expiresAt: number;
}

interface MemoryDataEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private memoryVotes = new Map<string, MemoryCacheEntry>();
  private memoryOnline = new Map<string, MemoryOnlineEntry>();
  private memoryData = new Map<string, MemoryDataEntry>();
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

    for (const [key, entry] of this.memoryOnline.entries()) {
      if (entry.expiresAt < now) {
        this.memoryOnline.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this.memoryData.entries()) {
      if (entry.expiresAt < now) {
        this.memoryData.delete(key);
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

  // ── Gestión de Votos ──────────────────────────────────────────

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
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.hset(
          key,
          participanteId.toString(),
          opcionId.toString(),
        );
        await client.expire(key, 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo al setear voto en Redis: ${error}`);
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
        this.logger.warn(`[CACHE:WARN] Fallo al obtener votos de Redis: ${error}`);
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
        this.logger.warn(`[CACHE:WARN] Fallo en persistencia atómica Redis: ${error}`);
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
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo limpieza Redis: ${error}`);
      }
    }
    this.memoryVotes.delete(key);
  }

  // ── Gestión de Pregunta Activa ─────────────────────────────────

  private getActiveQuestionKey(token: string): string {
    return `room:${token}:active-question`;
  }

  private getQuestionStatusKey(token: string): string {
    return `room:${token}:status`;
  }

  async setActiveQuestion(token: string, question: any): Promise<void> {
    const key = this.getActiveQuestionKey(token);
    const statusKey = this.getQuestionStatusKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.set(key, JSON.stringify(question), 'EX', 3600);
        await client.set(statusKey, 'released', 'EX', 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo setActiveQuestion Redis: ${error}`);
      }
    }

    this.memoryData.set(key, { data: question, expiresAt: Date.now() + 3600 * 1000 });
    this.memoryData.set(statusKey, { data: 'released', expiresAt: Date.now() + 3600 * 1000 });
  }

  async getActiveQuestion(token: string): Promise<any | null> {
    const key = this.getActiveQuestionKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getActiveQuestion Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? entry.data : null;
  }

  async setQuestionStatus(token: string, status: 'released' | 'answered'): Promise<void> {
    const key = this.getQuestionStatusKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.set(key, status, 'EX', 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo setQuestionStatus Redis: ${error}`);
      }
    }

    this.memoryData.set(key, { data: status, expiresAt: Date.now() + 3600 * 1000 });
  }

  async getQuestionStatus(token: string): Promise<string | null> {
    const key = this.getQuestionStatusKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        return await client.get(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getQuestionStatus Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? entry.data : null;
  }

  // ── Gestión de Habilitación de Sala ────────────────────────────

  private getRoomEnabledKey(token: string): string {
    return `room:${token}:enabled`;
  }

  async setRoomEnabled(token: string, enabled: boolean): Promise<void> {
    const key = this.getRoomEnabledKey(token);
    const value = enabled ? 'true' : 'false';
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.set(key, value, 'EX', 7200);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo setRoomEnabled Redis: ${error}`);
      }
    }

    this.memoryData.set(key, { data: value, expiresAt: Date.now() + 7200 * 1000 });
  }

  async isRoomEnabled(token: string): Promise<boolean> {
    const key = this.getRoomEnabledKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const val = await client.get(key);
        return val === null || val === 'true';
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo isRoomEnabled Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? entry.data === 'true' : true;
  }

  // ── Métodos de Utilidad ──────────────────────────────────────

  async get(key: string): Promise<string | null> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.get(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error genérico GET Redis: ${error}`);
      }
    }
    return null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.set(key, value, 'EX', ttlSeconds);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error genérico SET Redis: ${error}`);
      }
    }
  }

  /**
   * Valida y registra la existencia de un elemento en un set de forma atómica.
   * Retorna true si el elemento fue agregado (no existía), false si ya existía.
   */
  async checkAndSetDuplicate(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        const added = await client.sadd(key, value);
        if (added === 1) {
          await client.expire(key, ttlSeconds);
          return true;
        }
        return false;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error SADD Redis: ${error}`);
      }
    }

    // Fallback memoria (aproximado)
    let entry = this.memoryOnline.get(key);
    if (!entry) {
      entry = {
        participants: new Set<string>(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      };
      this.memoryOnline.set(key, entry);
    }
    if (entry.participants.has(value)) return false;
    entry.participants.add(value);
    return true;
  }

  // ── Gestión de participantes online ──────────────────────────

  async addParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const historyKey = `history:${tokenCompartido}`;
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.sadd(key, nickname);
        await client.sadd(historyKey, nickname);
        await client.expire(key, 3600);
        await client.expire(historyKey, 14400);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo addParticipant Redis: ${error}`);
      }
    }

    let entry = this.memoryOnline.get(key);
    if (!entry) {
      entry = { participants: new Set<string>(), expiresAt: Date.now() + 3600 * 1000 };
      this.memoryOnline.set(key, entry);
    }
    entry.participants.add(nickname);

    let histEntry = this.memoryOnline.get(historyKey);
    if (!histEntry) {
      histEntry = { participants: new Set<string>(), expiresAt: Date.now() + 14400 * 1000 };
      this.memoryOnline.set(historyKey, histEntry);
    }
    histEntry.participants.add(nickname);
  }

  async getSessionParticipantCount(tokenCompartido: string): Promise<number> {
    const historyKey = `history:${tokenCompartido}`;
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.scard(historyKey);
      } catch {
        return 0;
      }
    }
    const entry = this.memoryOnline.get(historyKey);
    return entry ? entry.participants.size : 0;
  }

  async removeParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.srem(key, nickname);
        return;
      } catch {
        this.logger.warn(`[CACHE:WARN] Fallo srem Redis: ${nickname}`);
      }
    }
    const entry = this.memoryOnline.get(key);
    if (entry) entry.participants.delete(nickname);
  }

  async getOnlineParticipants(tokenCompartido: string): Promise<string[]> {
    const key = `online:${tokenCompartido}`;
    const participants = new Set<string>();

    const memEntry = this.memoryOnline.get(key);
    if (memEntry) {
      for (const p of memEntry.participants) participants.add(p);
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.smembers(key);
        for (const p of data) participants.add(p);
      } catch {
        this.logger.warn(`[CACHE:WARN] Fallo smembers Redis: ${key}`);
      }
    }
    return Array.from(participants);
  }
}
