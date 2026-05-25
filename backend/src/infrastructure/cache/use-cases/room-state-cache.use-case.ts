import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface MemoryDataEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class RoomStateCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoomStateCacheUseCase.name);
  private memoryData = new Map<string, MemoryDataEntry>();
  private gcInterval: NodeJS.Timeout | null = null;

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
        `[CACHE:GC] Recolector de basura liberó ${count} claves en memoria expiradas.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.gcInterval) clearInterval(this.gcInterval);
  }

  private getActiveQuestionKey(token: string): string {
    return `room:${token}:active-question`;
  }

  private getQuestionStatusKey(token: string): string {
    return `room:${token}:status`;
  }

  private getRoomEnabledKey(token: string): string {
    return `room:${token}:enabled`;
  }

  private getRoomEstadoKey(token: string): string {
    return `room:${token}:estado`;
  }

  async setRoomEstado(token: string, estado: string): Promise<void> {
    const key = this.getRoomEstadoKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.set(key, estado, 'EX', 86400);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo setRoomEstado Redis: ${error}`);
      }
    }

    this.memoryData.set(key, { data: estado, expiresAt: Date.now() + 86400 * 1000 });
  }

  async getRoomEstado(token: string): Promise<string | null> {
    const key = this.getRoomEstadoKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        return await client.get(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getRoomEstado Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? entry.data : null;
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

  private getBlockedComidinesKey(token: string): string {
    return `room:${token}:comodines-bloqueados`;
  }

  async addBlockedComodin(token: string, tipoComodin: string): Promise<void> {
    const key = this.getBlockedComidinesKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.sadd(key, tipoComodin);
        await client.expire(key, 86400);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo addBlockedComodin Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    const current: string[] = entry ? entry.data : [];
    if (!current.includes(tipoComodin)) current.push(tipoComodin);
    this.memoryData.set(key, { data: current, expiresAt: Date.now() + 86400 * 1000 });
  }

  async getBlockedComodines(token: string): Promise<string[]> {
    const key = this.getBlockedComidinesKey(token);
    const client = this.redisService.getClient();

    if (client) {
      try {
        return await client.smembers(key);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getBlockedComodines Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? (entry.data as string[]) : [];
  }
}
