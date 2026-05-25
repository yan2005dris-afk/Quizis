import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis | null = null;
  private isHealthy = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.log(
        '[REDIS:FALLBACK] REDIS_URL no configurado. El sistema operará con caché en memoria.',
      );
      this.isHealthy = false;
      return;
    }

    try {
      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 10000,
        maxRetriesPerRequest: 0,
      });

      await this.redisClient.connect();
      await this.redisClient.ping();
      this.isHealthy = true;
      this.logger.log(
        '[REDIS:UP] Conexión con Upstash Redis establecida exitosamente.',
      );
    } catch (error) {
      this.logger.error(
        '[REDIS:ERROR] No se pudo conectar a Redis. Activando modo degradado.',
      );
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      this.handleFailure();
    }
  }

  private handleFailure() {
    this.isHealthy = false;
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {
        // Ignorar
      }
      this.redisClient = null;
    }

    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(async () => {
        this.reconnectTimeout = null;
        this.logger.log('[REDIS:RETRY] Intentando reconectar...');
        await this.connect();
      }, 30000);
    }
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('[REDIS:DOWN] Conexión cerrada.');
    }
  }

  getClient(): Redis | null {
    return this.isHealthy ? this.redisClient : null;
  }

  isHealthyStatus(): boolean {
    return this.isHealthy;
  }
}
