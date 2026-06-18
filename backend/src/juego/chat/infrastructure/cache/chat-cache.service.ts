import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../core/database/redis/redis.service';
import { MemoryCacheStore } from '../../../../core/cache/memory-cache.store';
import { ChatMessage } from '../../domain/types/chat.types';

@Injectable()
export class ChatCacheService {
  private readonly logger = new Logger(ChatCacheService.name);
  private readonly memory: MemoryCacheStore<ChatMessage[]>;
  private readonly TTL_SECONDS = 604_800; // 7 días
  private readonly MAX_MESSAGES = 200;

  constructor(private readonly redisService: RedisService) {
    this.memory = new MemoryCacheStore<ChatMessage[]>();
  }

  private getChatKey(token: string): string {
    return `room:${token}:chat`;
  }

  async addMessage(
    token: string,
    message: ChatMessage,
  ): Promise<ChatMessage[]> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();
    const raw = JSON.stringify(message);

    if (client) {
      try {
        await client.rpush(key, raw);
        await client.expire(key, this.TTL_SECONDS);
        const len = await client.llen(key);
        if (len > this.MAX_MESSAGES) {
          await client.ltrim(key, len - this.MAX_MESSAGES, -1);
        }
        return await this.getMessages(token);
      } catch (error) {
        this.logger.warn(`[CHAT:CACHE] Fallo addMessage Redis: ${error}`);
      }
    }

    // Fallback en memoria
    let messages = this.memory.get(key) ?? [];
    messages = [...messages, message];
    if (messages.length > this.MAX_MESSAGES) {
      messages = messages.slice(-this.MAX_MESSAGES);
    }
    this.memory.set(key, messages, this.TTL_SECONDS * 1000);
    return messages;
  }

  async getMessages(token: string): Promise<ChatMessage[]> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const data = await client.lrange(key, 0, -1);
        return data.map((raw) => JSON.parse(raw) as ChatMessage);
      } catch (error) {
        this.logger.warn(`[CHAT:CACHE] Fallo getMessages Redis: ${error}`);
      }
    }

    return this.memory.get(key) ?? [];
  }

  async clearMessages(token: string): Promise<void> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(key);
        return;
      } catch (error) {
        this.logger.warn(`[CHAT:CACHE] Fallo clearMessages Redis: ${error}`);
      }
    }

    this.memory.delete(key);
  }
}
