import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface ChatMessage {
  usuario: string;
  texto: string;
  timestamp: number;
  tipo: 'mensaje' | 'sugerencia';
}

interface MemoryChatEntry {
  messages: ChatMessage[];
  expiresAt: number;
}

@Injectable()
export class ChatCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatCacheUseCase.name);
  private memoryData = new Map<string, MemoryChatEntry>();
  private gcInterval: NodeJS.Timeout | null = null;

  // Safety TTL: 7 días por si el cleanup explícito (al finalizar sala) no se ejecuta.
  // El cleanup real se hace con clearMessages() en FinalizeRoomUseCase.
  private readonly TTL_SECONDS = 604800; // 7 días
  private readonly MAX_MESSAGES = 200; // límite de seguridad

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
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
        `[CACHE:GC] Recolector de basura liberó ${count} claves de chat en memoria expiradas.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.gcInterval) clearInterval(this.gcInterval);
  }

  private getChatKey(token: string): string {
    return `room:${token}:chat`;
  }

  /** Agrega un mensaje al chat de la sala y retorna la lista actualizada */
  async addMessage(token: string, message: ChatMessage): Promise<ChatMessage[]> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();
    const raw = JSON.stringify(message);

    if (client) {
      try {
        await client.rpush(key, raw);
        await client.expire(key, this.TTL_SECONDS);

        // Recortar si excede el máximo
        const len = await client.llen(key);
        if (len > this.MAX_MESSAGES) {
          await client.ltrim(key, len - this.MAX_MESSAGES, -1);
        }

        return await this.getMessages(token);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo addMessage Redis: ${error}`);
      }
    }

    // Fallback en memoria
    let entry = this.memoryData.get(key);
    if (!entry) {
      entry = {
        messages: [],
        expiresAt: Date.now() + this.TTL_SECONDS * 1000,
      };
      this.memoryData.set(key, entry);
    }
    entry.messages.push(message);

    // Recortar en memoria si excede
    if (entry.messages.length > this.MAX_MESSAGES) {
      entry.messages = entry.messages.slice(-this.MAX_MESSAGES);
    }

    return entry.messages;
  }

  /** Elimina todos los mensajes del chat de una sala */
  async clearMessages(token: string): Promise<void> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(key);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo clearMessages Redis: ${error}`);
      }
    }

    this.memoryData.delete(key);
  }

  /** Obtiene todos los mensajes del chat de una sala */
  async getMessages(token: string): Promise<ChatMessage[]> {
    const key = this.getChatKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const data = await client.lrange(key, 0, -1);
        return data.map((raw) => JSON.parse(raw) as ChatMessage);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getMessages Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? entry.messages : [];
  }
}
