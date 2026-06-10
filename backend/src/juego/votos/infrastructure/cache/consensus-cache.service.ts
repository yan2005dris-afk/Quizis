import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../core/database/redis/redis.service';
import { MemoryCacheStore } from '../../../../core/cache/memory-cache.store';

@Injectable()
export class ConsensusCacheService {
  private readonly logger = new Logger(ConsensusCacheService.name);
  private readonly votesMemory = new MemoryCacheStore<Map<string, number>>();
  private readonly requiredMemory = new MemoryCacheStore<Set<string>>();

  constructor(private readonly redisService: RedisService) {}

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
          `[CONSENSUS:CACHE] Fallo initializeRequired: ${error}`,
        );
      }
    }

    this.requiredMemory.set(key, new Set(nicknames), 3_600_000);
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
        this.logger.warn(`[CONSENSUS:CACHE] Fallo recordVote: ${error}`);
      }
    }

    const votes = this.votesMemory.get(key) ?? new Map<string, number>();
    votes.set(nickname, opcionId);
    this.votesMemory.set(key, votes, 3_600_000);
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
      } catch {
        // fallback a memoria
      }
    }

    const memVotes = this.votesMemory.get(key);
    return memVotes ? new Map(memVotes) : new Map();
  }

  async getRequired(token: string, preguntaId: number): Promise<Set<string>> {
    const key = this.getRequiredKey(token, preguntaId);
    const client = this.redisService.getClient();

    if (client) {
      try {
        const members = await client.smembers(key);
        return new Set(members);
      } catch {
        // fallback
      }
    }

    return this.requiredMemory.get(key) ?? new Set();
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
          `[CONSENSUS:CACHE] Fallo removeFromRequired: ${error}`,
        );
      }
    }

    const required = this.requiredMemory.get(key);
    if (required) {
      required.delete(nickname);
      this.requiredMemory.set(key, required, 3_600_000);
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
        this.logger.warn(`[CONSENSUS:CACHE] Fallo addToRequired: ${error}`);
      }
    }

    const required = this.requiredMemory.get(key) ?? new Set<string>();
    required.add(nickname);
    this.requiredMemory.set(key, required, 3_600_000);
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
        this.logger.warn(`[CONSENSUS:CACHE] Fallo clearConsensus: ${error}`);
      }
    }

    this.votesMemory.delete(votesKey);
    this.requiredMemory.delete(requiredKey);
  }
}
