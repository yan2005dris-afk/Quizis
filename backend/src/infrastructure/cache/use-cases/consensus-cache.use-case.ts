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
export class ConsensusCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsensusCacheUseCase.name);
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

  private getVotesKey(token: string, preguntaId: number): string {
    return `consensus:${token}:${preguntaId}:votes`;
  }

  private getRequiredKey(token: string, preguntaId: number): string {
    return `consensus:${token}:${preguntaId}:required`;
  }

  async initializeRequired(
    token: string,
    preguntaId: number,
    nicknames: string[],
  ): Promise<void> {
    const key = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(key);
        if (nicknames.length > 0) {
          await client.sadd(key, ...nicknames);
        }
        await client.expire(key, 3600);
        return;
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo initializeRequired Redis: ${error}`,
        );
      }
    }

    this.memoryData.set(key, {
      data: new Set<string>(nicknames),
      expiresAt: Date.now() + 3600 * 1000,
    });
  }

  async recordVote(
    token: string,
    preguntaId: number,
    nickname: string,
    opcionId: number,
  ): Promise<void> {
    const key = this.getVotesKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.hset(key, nickname, opcionId.toString());
        await client.expire(key, 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo recordVote Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    const votes: Map<string, number> = entry
      ? entry.data
      : new Map<string, number>();
    votes.set(nickname, opcionId);
    this.memoryData.set(key, {
      data: votes,
      expiresAt: Date.now() + 3600 * 1000,
    });
  }

  async getVotes(
    token: string,
    preguntaId: number,
  ): Promise<Map<string, number>> {
    const key = this.getVotesKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const data = await client.hgetall(key);
        const result = new Map<string, number>();
        for (const [nickname, opcionIdStr] of Object.entries(data)) {
          result.set(nickname, parseInt(opcionIdStr, 10));
        }
        return result;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getVotes Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? new Map(entry.data) : new Map<string, number>();
  }

  async getRequired(token: string, preguntaId: number): Promise<Set<string>> {
    const key = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const members = await client.smembers(key);
        return new Set<string>(members);
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo getRequired Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    return entry ? new Set<string>(entry.data) : new Set<string>();
  }

  async removeFromRequired(
    token: string,
    preguntaId: number,
    nickname: string,
  ): Promise<void> {
    const key = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.srem(key, nickname);
        return;
      } catch (error) {
        this.logger.warn(
          `[CACHE:WARN] Fallo removeFromRequired Redis: ${error}`,
        );
      }
    }

    const entry = this.memoryData.get(key);
    if (entry) {
      (entry.data as Set<string>).delete(nickname);
    }
  }

  async addToRequired(
    token: string,
    preguntaId: number,
    nickname: string,
  ): Promise<void> {
    const key = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.sadd(key, nickname);
        await client.expire(key, 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo addToRequired Redis: ${error}`);
      }
    }

    const entry = this.memoryData.get(key);
    if (entry) {
      (entry.data as Set<string>).add(nickname);
    } else {
      this.memoryData.set(key, {
        data: new Set<string>([nickname]),
        expiresAt: Date.now() + 3600 * 1000,
      });
    }
  }

  async clearConsensus(token: string, preguntaId: number): Promise<void> {
    const votesKey = this.getVotesKey(token, preguntaId);
    const requiredKey = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        await client.del(votesKey, requiredKey);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Fallo clearConsensus Redis: ${error}`);
      }
    }

    this.memoryData.delete(votesKey);
    this.memoryData.delete(requiredKey);
  }
}
