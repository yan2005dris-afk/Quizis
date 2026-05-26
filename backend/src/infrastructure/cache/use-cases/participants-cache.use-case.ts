import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface MemoryOnlineEntry {
  participants: Set<string>;
  expiresAt: number;
}

@Injectable()
export class ParticipantsCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParticipantsCacheUseCase.name);
  private memoryOnline = new Map<string, MemoryOnlineEntry>();
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
  }

  private runMemoryGC() {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.memoryOnline.entries()) {
      if (entry.expiresAt < now) {
        this.memoryOnline.delete(key);
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
      entry = {
        participants: new Set<string>(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      this.memoryOnline.set(key, entry);
    }
    entry.participants.add(nickname);

    let histEntry = this.memoryOnline.get(historyKey);
    if (!histEntry) {
      histEntry = {
        participants: new Set<string>(),
        expiresAt: Date.now() + 14400 * 1000,
      };
      this.memoryOnline.set(historyKey, histEntry);
    }
    histEntry.participants.add(nickname);
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

  async getHistoricalParticipants(tokenCompartido: string): Promise<string[]> {
    const historyKey = `history:${tokenCompartido}`;
    const participants = new Set<string>();

    const memEntry = this.memoryOnline.get(historyKey);
    if (memEntry) {
      for (const p of memEntry.participants) participants.add(p);
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.smembers(historyKey);
        for (const p of data) participants.add(p);
      } catch {
        this.logger.warn(`[CACHE:WARN] Fallo smembers Redis: ${historyKey}`);
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
    const entry = this.memoryOnline.get(historyKey);
    return entry ? entry.participants.size : 0;
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
}
