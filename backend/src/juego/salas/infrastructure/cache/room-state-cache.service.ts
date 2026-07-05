import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../core/database/redis/redis.service';
import { MemoryCacheStore } from '../../../../core/cache/memory-cache.store';

@Injectable()
export class RoomStateCacheService {
  private readonly logger = new Logger(RoomStateCacheService.name);
  private readonly memory = new MemoryCacheStore<unknown>();

  constructor(private readonly redisService: RedisService) {}

  private key(token: string, suffix: string): string {
    return `room:${token}:${suffix}`;
  }

  // ── Estado de sala ──

  async setRoomEstado(token: string, estado: string): Promise<void> {
    const k = this.key(token, 'estado');
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.set(k, estado, 'EX', 86_400);
        return;
      } catch (e) {
        this.logger.warn(`[ROOM:CACHE] Fallo setRoomEstado: ${e}`);
      }
    }
    this.memory.set(k, estado, 86_400_000);
  }

  async getRoomEstado(token: string): Promise<string | null> {
    const k = this.key(token, 'estado');
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.get(k);
      } catch {
        /* fallback */
      }
    }
    return (this.memory.get(k) as string | undefined) ?? null;
  }

  // ── Pregunta activa ──

  async setActiveQuestion(token: string, question: any): Promise<void> {
    const k = this.key(token, 'active-question');
    const sk = this.key(token, 'status');
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.set(k, JSON.stringify(question), 'EX', 3600);
        await client.set(sk, 'released', 'EX', 3600);
        return;
      } catch (e) {
        this.logger.warn(`[ROOM:CACHE] Fallo setActiveQuestion: ${e}`);
      }
    }
    this.memory.set(k, question, 3_600_000);
    this.memory.set(sk, 'released', 3_600_000);
  }

  async getActiveQuestion(token: string): Promise<any | null> {
    const k = this.key(token, 'active-question');
    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.get(k);
        return data ? JSON.parse(data) : null;
      } catch {
        /* fallback */
      }
    }
    return this.memory.get(k) ?? null;
  }

  async setQuestionStatus(
    token: string,
    status: 'released' | 'answered',
  ): Promise<void> {
    const sk = this.key(token, 'status');
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.set(sk, status, 'EX', 3600);
        return;
      } catch {
        /* fallback */
      }
    }
    this.memory.set(sk, status, 3_600_000);
  }

  /**
   * Atomically set the question status to 'answered' only if not already set.
   * Returns true if this caller won the race (key was set), false if another
   * caller already set it.
   *
   * Used to prevent double-persistence when student answer and timer
   * expiration fire near-simultaneously. First writer wins.
   *
   * Single-instance mode (no Redis): falls back to non-atomic set + returns
   * true. Logs a warning because the race is not actually prevented in that
   * mode (acceptable in dev, not for production).
   */
  async setQuestionStatusNX(
    token: string,
    status: 'answered',
  ): Promise<boolean> {
    const sk = this.key(token, 'status');
    const client = this.redisService.getClient();
    if (client) {
      try {
        const result = await client.set(sk, status, 'EX', 3600, 'NX');
        // ioredis returns 'OK' on success, null on NX failure
        return result === 'OK';
      } catch (err) {
        // Redis failed — fall through to memory fallback (non-atomic)
        this.logger.warn(
          `[RoomStateCache] Redis SET NX failed, falling back to memory: ${err}`,
        );
      }
    } else {
      this.logger.warn(
        '[RoomStateCache] Running in single-instance mode without Redis NX guard — last writer wins',
      );
    }
    this.memory.set(sk, status, 3_600_000);
    return true;
  }

  async getQuestionStatus(token: string): Promise<string | null> {
    const sk = this.key(token, 'status');
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.get(sk);
      } catch {
        /* fallback */
      }
    }
    return (this.memory.get(sk) as string | undefined) ?? null;
  }

  // ── Habilitación ──

  async setRoomEnabled(token: string, enabled: boolean): Promise<void> {
    const k = this.key(token, 'enabled');
    const val = enabled ? 'true' : 'false';
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.set(k, val, 'EX', 7200);
        return;
      } catch {
        /* fallback */
      }
    }
    this.memory.set(k, val, 7_200_000);
  }

  async isRoomEnabled(token: string): Promise<boolean> {
    const k = this.key(token, 'enabled');
    const client = this.redisService.getClient();
    if (client) {
      try {
        const val = await client.get(k);
        return val === null || val === 'true';
      } catch {
        /* fallback */
      }
    }
    const val = this.memory.get(k);
    return val === undefined || val === 'true';
  }

  // ── Comodines bloqueados ──

  async addBlockedComodin(token: string, tipoComodin: string): Promise<void> {
    const k = this.key(token, 'comodines-bloqueados');
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.sadd(k, tipoComodin);
        await client.expire(k, 86_400);
        return;
      } catch {
        /* fallback */
      }
    }
    const current = (this.memory.get(k) as string[] | undefined) ?? [];
    if (!current.includes(tipoComodin)) current.push(tipoComodin);
    this.memory.set(k, current, 86_400_000);
  }

  async getBlockedComodines(token: string): Promise<string[]> {
    const k = this.key(token, 'comodines-bloqueados');
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.smembers(k);
      } catch {
        /* fallback */
      }
    }
    return (this.memory.get(k) as string[]) ?? [];
  }

  // ── Limpieza ──

  async clearRoundState(token: string): Promise<void> {
    const keys = ['active-question', 'status', 'comodines-bloqueados'].map(
      (s) => this.key(token, s),
    );
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(...keys);
        return;
      } catch {
        /* fallback */
      }
    }
    for (const k of keys) this.memory.delete(k);
  }
}
