import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/database/redis/redis.service';
import { MemoryCacheStore } from '../../../infrastructure/cache/memory-cache.store';

@Injectable()
export class ParticipantsCacheService {
  private readonly logger = new Logger(ParticipantsCacheService.name);
  private readonly historyMemory = new MemoryCacheStore<Set<string>>();
  private readonly counterMemory = new MemoryCacheStore<Map<string, number>>();

  constructor(private readonly redisService: RedisService) {}

  // ── Redis helpers ──

  private async redisMutate(
    key: string,
    fn: () => Promise<void>,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client) return false;
    try {
      await fn();
      return true;
    } catch (error: any) {
      if (error?.message?.includes('WRONGTYPE')) {
        this.logger.warn(`[PART:CACHE] Migrando clave ${key} de SET a HASH`);
        await client.del(key);
        try {
          await fn();
          return true;
        } catch {
          /* fallback */
        }
      } else {
        this.logger.warn(`[PART:CACHE] Error Redis: ${error}`);
      }
    }
    return false;
  }

  private async redisReadCounters(key: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const client = this.redisService.getClient();
    if (!client) return result;
    try {
      const fields = await client.hgetall(key);
      for (const [nickname, countStr] of Object.entries(fields)) {
        result.set(nickname, parseInt(countStr, 10) || 1);
      }
    } catch {
      try {
        const members = await client.smembers(key);
        for (const nickname of members) result.set(nickname, 1);
        if (members.length > 0) {
          this.logger.warn(`[PART:CACHE] Migrando online:${key} de SET a HASH`);
          await client.del(key);
          for (const nickname of members)
            await client.hincrby(key, nickname, 1);
          await client.expire(key, 3600);
        }
      } catch {
        /* sin Redis */
      }
    }
    return result;
  }

  // ── Online participants ──

  async addParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const historyKey = `history:${tokenCompartido}`;
    const client = this.redisService.getClient();

    const redisOk = await this.redisMutate(key, async () => {
      const newCount = await client!.hincrby(key, nickname, 1);
      if (newCount === 1) {
        await client!.sadd(historyKey, nickname);
        await client!.expire(historyKey, 14_400);
      }
      await client!.expire(key, 3600);
    });

    if (redisOk) return;

    // Fallback memoria
    const counters = this.counterMemory.get(key) ?? new Map<string, number>();
    counters.set(nickname, (counters.get(nickname) ?? 0) + 1);
    this.counterMemory.set(key, counters, 3_600_000);

    const history = this.historyMemory.get(historyKey) ?? new Set<string>();
    history.add(nickname);
    this.historyMemory.set(historyKey, history, 14_400_000);
  }

  async removeParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const client = this.redisService.getClient();

    const redisOk = await this.redisMutate(key, async () => {
      const newCount = await client!.hincrby(key, nickname, -1);
      if (newCount <= 0) await client!.hdel(key, nickname);
    });

    if (redisOk) return;

    const counters = this.counterMemory.get(key);
    if (!counters) return;
    const current = counters.get(nickname) ?? 0;
    if (current <= 1) counters.delete(nickname);
    else counters.set(nickname, current - 1);
    this.counterMemory.set(key, counters, 3_600_000);
  }

  async getOnlineParticipants(tokenCompartido: string): Promise<string[]> {
    const key = `online:${tokenCompartido}`;
    const participants = new Set<string>();

    const memCounters = this.counterMemory.get(key);
    if (memCounters) {
      for (const [nickname, count] of memCounters) {
        if (count > 0) participants.add(nickname);
      }
    }

    const redisCounters = await this.redisReadCounters(key);
    for (const [nickname, count] of redisCounters) {
      if (count > 0) participants.add(nickname);
    }

    return Array.from(participants);
  }

  async getHistoricalParticipants(tokenCompartido: string): Promise<string[]> {
    const historyKey = `history:${tokenCompartido}`;
    const participants = new Set<string>();

    const mem = this.historyMemory.get(historyKey);
    if (mem) for (const p of mem) participants.add(p);

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.smembers(historyKey);
        for (const p of data) participants.add(p);
      } catch {
        /* fallback */
      }
    }
    return Array.from(participants);
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
    return this.historyMemory.get(historyKey)?.size ?? 0;
  }

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
      } catch {
        /* fallback */
      }
    }

    const entry = this.historyMemory.get(key) ?? new Set<string>();
    if (entry.has(value)) return false;
    entry.add(value);
    this.historyMemory.set(key, entry, ttlSeconds * 1000);
    return true;
  }
}
