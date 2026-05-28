import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface MemoryHelperEntry {
  helperNickname: string;
  expiresAt: number;
}

@Injectable()
export class HelperCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HelperCacheUseCase.name);
  private memoryData = new Map<string, MemoryHelperEntry>();
  private gcInterval: NodeJS.Timeout | null = null;

  private readonly TTL_SECONDS = 600; // 10 minutos segun el lineamiento

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
  }

  async onModuleDestroy() {
    if (this.gcInterval) clearInterval(this.gcInterval);
  }

  private runMemoryGC() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.memoryData.entries()) {
      if (entry.expiresAt < now) {
        this.memoryData.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(
        `[CACHE:GC] Recolector de basura liberó ${count} claves de helper en memoria expiradas.`,
      );
    }
  }

  private getHelperKey(token: string): string {
    return `socket:helper:${token}`;
  }

  async saveActiveHelper(token: string, helperNickname: string): Promise<void> {
    const key = this.getHelperKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.set(key, helperNickname, 'EX', this.TTL_SECONDS);
        return;
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo saveActiveHelper Redis: ${error}. Usando fallback en memoria.`,
        );
      }
    }

    this.memoryData.set(key, {
      helperNickname,
      expiresAt: Date.now() + this.TTL_SECONDS * 1000,
    });
  }

  async getActiveHelper(token: string): Promise<string | null> {
    const key = this.getHelperKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        return await client.get(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getActiveHelper Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.helperNickname;
    return null;
  }

  async removeActiveHelper(token: string): Promise<void> {
    const key = this.getHelperKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(key);
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo removeActiveHelper Redis: ${error}`,
        );
      }
    }

    this.memoryData.delete(key);
  }
}
