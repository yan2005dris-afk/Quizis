import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../database/redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

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

  async del(key: string): Promise<void> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        await client.del(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error genérico DEL Redis: ${error}`);
      }
    }
  }
}
