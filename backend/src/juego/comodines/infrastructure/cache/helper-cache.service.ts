import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../core/database/redis/redis.service';
import { MemoryCacheStore } from '../../../../core/cache/memory-cache.store';

@Injectable()
export class HelperCacheService {
  private readonly logger = new Logger(HelperCacheService.name);
  private readonly memory: MemoryCacheStore<string>;
  private readonly TTL_SECONDS = 600;

  constructor(private readonly redisService: RedisService) {
    this.memory = new MemoryCacheStore<string>();
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
          `[HELPER:CACHE] Fallo saveActiveHelper Redis: ${error}`,
        );
      }
    }

    this.memory.set(key, helperNickname, this.TTL_SECONDS * 1000);
  }

  async getActiveHelper(token: string): Promise<string | null> {
    const key = this.getHelperKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        return await client.get(key);
      } catch (error) {
        this.logger.warn(
          `[HELPER:CACHE] Fallo getActiveHelper Redis: ${error}`,
        );
      }
    }

    return this.memory.get(key) ?? null;
  }

  async removeActiveHelper(token: string): Promise<void> {
    const key = this.getHelperKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(key);
      } catch {
        // ignorar
      }
    }

    this.memory.delete(key);
  }
}
