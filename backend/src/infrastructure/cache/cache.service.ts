import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private memoryVotes = new Map<string, Map<number, number>>(); // Fallback: key "votes:ronda:pregunta" -> Map<participanteId, opcionId>

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    if (redisHost) {
      this.logger.log(`[CACHE:INIT] Intentando conectar a Redis en ${redisHost}:${redisPort}...`);
      try {
        this.redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          lazyConnect: true,
          connectTimeout: 3000,
          maxRetriesPerRequest: 1,
        });

        await this.redisClient.connect();
        this.logger.log('[CACHE:UP] Conexión con Redis establecida exitosamente.');
      } catch (error) {
        this.logger.warn(
          `[CACHE:FALLBACK] Falló la conexión a Redis en ${redisHost}:${redisPort}. Usando caché en memoria de JS.`,
        );
        this.redisClient = null;
      }
    } else {
      this.logger.log('[CACHE:FALLBACK] REDIS_HOST no configurado o nulo. Usando caché en memoria de JS por defecto.');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('[CACHE:DOWN] Conexión con Redis cerrada.');
    }
  }

  private getVoteKey(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}`;
  }

  async setVote(rondaId: number, preguntaId: number, participanteId: number, opcionId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      await this.redisClient.hset(key, participanteId.toString(), opcionId.toString());
    } else {
      let questionMap = this.memoryVotes.get(key);
      if (!questionMap) {
        questionMap = new Map<number, number>();
        this.memoryVotes.set(key, questionMap);
      }
      questionMap.set(participanteId, opcionId);
    }
  }

  async getVotes(rondaId: number, preguntaId: number): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      const data = await this.redisClient.hgetall(key);
      return Object.entries(data).map(([pId, oId]) => ({
        participanteId: parseInt(pId, 10),
        opcionId: parseInt(oId, 10),
      }));
    } else {
      const questionMap = this.memoryVotes.get(key);
      if (!questionMap) return [];
      return Array.from(questionMap.entries()).map(([pId, oId]) => ({
        participanteId: pId,
        opcionId: oId,
      }));
    }
  }

  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      await this.redisClient.del(key);
    } else {
      this.memoryVotes.delete(key);
    }
  }
}
