import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryCacheEntry {
  votes: Map<number, number>;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private memoryVotes = new Map<string, MemoryCacheEntry>(); // Fallback con TTL
  private isRedisHealthy = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connectRedis();
    // Iniciar colector de basura en memoria cada 5 minutos
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
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

    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(async () => {
        this.reconnectTimeout = null;
        this.logger.log('[CACHE:RETRY] Intentando reconectar a Redis en segundo plano...');
        await this.connectRedis();
      }, 30000);
    }
  }

  /**
   * Recolector de basura para evitar fugas de memoria en el fallback.
   */
  private runMemoryGC() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.memoryVotes.entries()) {
      if (entry.expiresAt < now) {
        this.memoryVotes.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`[CACHE:GC] Recolector de basura liberó ${count} claves en memoria expiradas.`);
    }
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.gcInterval) clearInterval(this.gcInterval);
    
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

  private getProcessingPattern(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing:*`;
  }

  private getProcessingPrefix(rondaId: number, preguntaId: number): string {
    return `votes:${rondaId}:${preguntaId}:processing:`;
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
    let entry = this.memoryVotes.get(key);
    if (!entry) {
      entry = { votes: new Map<number, number>(), expiresAt: Date.now() + 3600 * 1000 };
      this.memoryVotes.set(key, entry);
    }
    entry.votes.set(participanteId, opcionId);
  }

  /**
   * Fusión híbrida de fuentes (Redis + Memoria).
   * Si Redis se cayó y volvió a estar sano, lee ambos para garantizar cero pérdida de votos.
   */
  async getVotes(rondaId: number, preguntaId: number): Promise<{ participanteId: number; opcionId: number }[]> {
    const key = this.getVoteKey(rondaId, preguntaId);
    const votesMap = new Map<number, number>();

    // 1. Cargar votos de memoria (si existen residuos)
    const memEntry = this.memoryVotes.get(key);
    if (memEntry) {
      for (const [pId, oId] of memEntry.votes.entries()) {
        votesMap.set(pId, oId);
      }
    }

    // 2. Cargar votos de Redis (si está saludable)
    if (this.redisClient && this.isRedisHealthy) {
      try {
        const data = await this.redisClient.hgetall(key);
        for (const [pId, oId] of Object.entries(data)) {
          votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante getVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }

    return Array.from(votesMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));
  }

  /**
   * FASE 1: Aislar votos de forma atómica en una clave única `:processing:${timestamp}`.
   * AUTORECUPERACIÓN: Escanea y fusiona cualquier clave `:processing:*` vieja de ejecuciones fallidas previas.
   */
  async prepareVotesForPersist(rondaId: number, preguntaId: number): Promise<{ processingKey: string; votes: { participanteId: number; opcionId: number }[] }> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);
    const uniqueProcKey = `${this.getProcessingPrefix(rondaId, preguntaId)}${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const votesMap = new Map<number, number>();

    // ─── A. Autorecuperación y Fusión en memoria ───
    const procPrefix = this.getProcessingPrefix(rondaId, preguntaId);
    for (const [memKey, entry] of this.memoryVotes.entries()) {
      if (memKey.startsWith(procPrefix) || memKey === originalKey) {
        for (const [pId, oId] of entry.votes.entries()) {
          votesMap.set(pId, oId);
        }
        this.memoryVotes.delete(memKey);
      }
    }

    // ─── B. Autorecuperación y Fusión en Redis ───
    if (this.redisClient && this.isRedisHealthy) {
      try {
        // 1. Escanear y fusionar claves :processing:* huérfanas
        const pattern = this.getProcessingPattern(rondaId, preguntaId);
        const orphanKeys = await this.redisClient.keys(pattern);
        
        for (const orphanKey of orphanKeys) {
          const raw = await this.redisClient.hgetall(orphanKey);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
          await this.redisClient.del(orphanKey);
        }

        // 2. Renombrar la clave original de forma atómica a la clave única actual
        const tx = this.redisClient.multi();
        tx.exists(originalKey);
        tx.rename(originalKey, uniqueProcKey);
        
        const results = await tx.exec();
        if (results && results[0] && results[0][1] === 1) {
          const raw = await this.redisClient.hgetall(uniqueProcKey);
          for (const [pId, oId] of Object.entries(raw)) {
            votesMap.set(parseInt(pId, 10), parseInt(oId, 10));
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante prepareVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }

    // Si recolectamos votos en total
    const finalVotes = Array.from(votesMap.entries()).map(([pId, oId]) => ({
      participanteId: pId,
      opcionId: oId,
    }));

    if (finalVotes.length > 0) {
      // Guardamos síncronamente en memoria de procesamiento
      const map = new Map<number, number>();
      for (const v of finalVotes) {
        map.set(v.participanteId, v.opcionId);
      }
      this.memoryVotes.set(uniqueProcKey, { votes: map, expiresAt: Date.now() + 3600 * 1000 });
    }

    return { processingKey: uniqueProcKey, votes: finalVotes };
  }

  async commitVotes(processingKey: string): Promise<void> {
    if (this.redisClient && this.isRedisHealthy) {
      try {
        await this.redisClient.del(processingKey);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante commitVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }
    this.memoryVotes.delete(processingKey);
  }

  /**
   * FASE 2: Rollback por Fallo en Base de Datos.
   * Restaura los votos de vuelta al key principal con EXPIRE para asegurar TTL.
   */
  async rollbackVotes(processingKey: string, rondaId: number, preguntaId: number): Promise<void> {
    const originalKey = this.getVoteKey(rondaId, preguntaId);
    
    // Rollback en memoria
    const procEntry = this.memoryVotes.get(processingKey);
    if (procEntry) {
      let originalEntry = this.memoryVotes.get(originalKey);
      if (!originalEntry) {
        originalEntry = { votes: new Map<number, number>(), expiresAt: Date.now() + 3600 * 1000 };
        this.memoryVotes.set(originalKey, originalEntry);
      }
      for (const [pId, oId] of procEntry.votes.entries()) {
        originalEntry.votes.set(pId, oId);
      }
      this.memoryVotes.delete(processingKey);
    }

    // Rollback en Redis
    if (this.redisClient && this.isRedisHealthy) {
      try {
        const procData = await this.redisClient.hgetall(processingKey);
        if (Object.keys(procData).length > 0) {
          const tx = this.redisClient.multi();
          for (const [pId, oId] of Object.entries(procData)) {
            tx.hset(originalKey, pId, oId);
          }
          // Asegurar el TTL en la clave de retorno original
          tx.expire(originalKey, 3600);
          tx.del(processingKey);
          await tx.exec();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante rollbackVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }
  }

  async clearVotes(rondaId: number, preguntaId: number): Promise<void> {
    const key = this.getVoteKey(rondaId, preguntaId);
    if (this.redisClient && this.isRedisHealthy) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CACHE:WARN] Error en Redis durante clearVotes: ${errorMsg}.`);
        this.handleRedisFailure();
      }
    }
    this.memoryVotes.delete(key);
  }
}
