import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private memoryVotes = new Map<string, Map<number, number>>(); // Fallback síncrono
  private isRedisHealthy = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connectRedis();
  }

  private async connectRedis() {
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
        this.isRedisHealthy = true;
        this.logger.log('[CACHE:UP] Conexión con Redis establecida exitosamente.');
      } catch (error) {
        this.logger.error(
          `[CACHE:FALLBACK] Falló la conexión a Redis en ${redisHost}:${redisPort}. Limpiando e implementando fallback en memoria de JS.`,
          error instanceof Error ? error.stack : String(error),
        );
        this.handleRedisFailure();
      }
    } else {
      this.logger.log('[CACHE:FALLBACK] REDIS_HOST no configurado. Usando caché en memoria de JS.');
    }
  }

  private handleRedisFailure() {
    this.isRedisHealthy = false;
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
      this.redisClient = null;
    }

    // Programar reintento silencioso en 30 segundos
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(async () => {
        this.reconnectTimeout = null;
        this.logger.log('[CACHE:RETRY] Intentando reconectar a Redis en segundo plano...');
        await this.connectRedis();
      }, 30000);
    }
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
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

  private getProcessingKey(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing`;
  }

  async setVote(rondaId: number, preguntaId: number, participanteId: number, opcionId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient && this.isRedisHealthy) {
      try {
        await this.redisClient.hset(key, participanteId.toString(), opcionId.toString());
        await this.redisClient.expire(key, 3600);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante setVote: ${errorMsg}. Activando fallback temporal en memoria.`);
        this.handleRedisFailure();
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

  async getVotes(rondaId: number, preguntaId: number): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient && this.isRedisHealthy) {
      try {
        const data = await this.redisClient.hgetall(key);
        return Object.entries(data).map(([pId, oId]) => ({
          participanteId: parseInt(pId, 10),
          opcionId: parseInt(oId, 10),
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante getVotes: ${errorMsg}. Activando fallback temporal en memoria.`);
        this.handleRedisFailure();
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
   * FASE 1: Aislar votos en una clave ':processing' de forma atómica.
   * Esto previene colisiones y condiciones de carrera con nuevos votos entrantes.
   */
  async prepareVotesForPersist(rondaId: number, preguntaId: number): Promise<{ processingKey: string; votes: { participanteId: number; opcionId: number }[] }> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);
    const procKey = this.getProcessingKey(rondaId, preguntaId);

    if (this.redisClient && this.isRedisHealthy) {
      try {
        // Operación Transaccional Atómica MULTI/EXEC para renombrar de forma segura
        const tx = this.redisClient.multi();
        tx.exists(originalKey);
        tx.rename(originalKey, procKey);
        
        const results = await tx.exec();
        // Si la clave existía y se renombró correctamente
        if (results && results[0] && results[0][1] === 1) {
          const raw = await this.redisClient.hgetall(procKey);
          const votes = Object.entries(raw).map(([pId, oId]) => ({
            participanteId: parseInt(pId, 10),
            opcionId: parseInt(oId, 10),
          }));
          return { processingKey: procKey, votes };
        }
        return { processingKey: procKey, votes: [] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante prepareVotes: ${errorMsg}. Usando fallback en memoria.`);
        this.handleRedisFailure();
      }
    }

    // Fallback memoria atómico síncrono
    const questionMap = this.memoryVotes.get(originalKey);
    if (!questionMap) {
      return { processingKey: procKey, votes: [] };
    }
    
    // Mover de clave de forma atómica síncrona
    this.memoryVotes.delete(originalKey);
    this.memoryVotes.set(procKey, questionMap);
    
    const votes = Array.from(questionMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
    return { processingKey: procKey, votes };
  }

  /**
   * FASE 2: Confirmación Exitosa. Se eliminan definitivamente los votos aislados.
   */
  async commitVotes(processingKey: string): Promise<void> {
    if (this.redisClient && this.isRedisHealthy) {
      try {
        await this.redisClient.del(processingKey);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante commitVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }
    this.memoryVotes.delete(processingKey);
  }

  /**
   * FASE 2: Rollback por Fallo. Fusiona de forma atómica los votos en procesamiento
   * de vuelta al key principal para evitar cualquier pérdida de datos.
   */
  async rollbackVotes(processingKey: string, rondaId: number, preguntaId: number): Promise<void> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);
    
    if (this.redisClient && this.isRedisHealthy) {
      try {
        // Obtenemos los votos en procesamiento
        const procData = await this.redisClient.hgetall(processingKey);
        if (Object.keys(procData).length > 0) {
          // Fusionamos de forma transaccional usando MULTI
          const tx = this.redisClient.multi();
          for (const [pId, oId] of Object.entries(procData)) {
            tx.hset(originalKey, pId, oId);
          }
          tx.del(processingKey);
          await tx.exec();
        }
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante rollbackVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }

    // Rollback en memoria
    const procMap = this.memoryVotes.get(processingKey);
    if (procMap) {
      let originalMap = this.memoryVotes.get(originalKey);
      if (!originalMap) {
        originalMap = new Map<number, number>();
        this.memoryVotes.set(originalKey, originalMap);
      }
      // Fusionamos los mapas
      for (const [pId, oId] of procMap.entries()) {
        originalMap.set(pId, oId);
      }
      this.memoryVotes.delete(processingKey);
    }
  }

  /**
   * Elimina explícitamente los votos.
   */
  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient && this.isRedisHealthy) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante clearVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }
    this.memoryVotes.delete(key);
  }
}
