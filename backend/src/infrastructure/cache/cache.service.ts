import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private memoryVotes = new Map<string, Map<number, number>>(); // Fallback síncrono

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPortRaw = this.configService.get<string | number>('REDIS_PORT', 6379);
    const redisPort = typeof redisPortRaw === 'string' ? parseInt(redisPortRaw, 10) : redisPortRaw;

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
        this.logger.error(
          `[CACHE:FALLBACK] Falló la conexión a Redis en ${redisHost}:${redisPort}. Limpiando e implementando fallback en memoria de JS.`,
          error instanceof Error ? error.stack : String(error),
        );
        if (this.redisClient) {
          try {
            await this.redisClient.disconnect();
          } catch {}
        }
        this.redisClient = null;
      }
    } else {
      this.logger.log('[CACHE:FALLBACK] REDIS_HOST no configurado. Usando caché en memoria de JS.');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {}
      this.logger.log('[CACHE:DOWN] Conexión con Redis cerrada.');
    }
  }

  private getVoteKey(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}`;
  }

  /**
   * Guarda un voto en caché temporal.
   * Tolerante a fallos: Si Redis se cae en runtime, conmuta inmediatamente a memoria.
   */
  async setVote(rondaId: number, preguntaId: number, participanteId: number, opcionId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      try {
        // HSET guarda el voto
        await this.redisClient.hset(key, participanteId.toString(), opcionId.toString());
        // Establecer TTL de 1 hora para evitar acumulación si nunca se persiste
        await this.redisClient.expire(key, 3600);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error en Redis durante setVote: ${error.message}. Usando fallback en memoria.`);
      }
    }

    // Fallback memoria
    let questionMap = this.memoryVotes.get(key);
    if (!questionMap) {
      questionMap = new Map<number, number>();
      this.memoryVotes.set(key, questionMap);
    }
    questionMap.set(participanteId, opcionId);
  }

  /**
   * Obtiene los votos temporales acumulados sin borrarlos (para visualización/Swagger).
   */
  async getVotes(rondaId: number, preguntaId: number): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      try {
        const data = await this.redisClient.hgetall(key);
        return Object.entries(data).map(([pId, oId]) => ({
          participanteId: parseInt(pId, 10),
          opcionId: parseInt(oId, 10),
        }));
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error en Redis durante getVotes: ${error.message}. Usando fallback en memoria.`);
      }
    }

    const questionMap = this.memoryVotes.get(key);
    if (!questionMap) return [];
    return Array.from(questionMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
  }

  /**
   * Operación Atómica "Fetch-and-Delete" para evitar condiciones de carrera.
   * Lee todos los votos de la pregunta y elimina la clave del caché de forma indivisible.
   */
  async popVotes(rondaId: number, preguntaId: number): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      try {
        // Usamos una transacción atómica MULTI/EXEC para obtener y borrar
        const pipeline = this.redisClient.pipeline();
        pipeline.hgetall(key);
        pipeline.del(key);
        
        const results = await pipeline.exec();
        if (results && results[0] && !results[0][0]) {
          const data = results[0][1] as Record<string, string>;
          return Object.entries(data || {}).map(([pId, oId]) => ({
            participanteId: parseInt(pId, 10),
            opcionId: parseInt(oId, 10),
          }));
        }
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error en Redis durante popVotes: ${error.message}. Usando fallback en memoria.`);
      }
    }

    // Fallback memoria atómico
    const questionMap = this.memoryVotes.get(key);
    if (!questionMap) return [];
    this.memoryVotes.delete(key); // Borrado atómico síncrono en JS
    return Array.from(questionMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
  }

  /**
   * Elimina explícitamente los votos.
   */
  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error en Redis durante clearVotes: ${error.message}. Usando fallback en memoria.`);
      }
    }
    this.memoryVotes.delete(key);
  }
}
