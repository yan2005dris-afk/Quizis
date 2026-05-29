import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../../database/redis/redis.service';

interface MemoryOnlineEntry {
  participants: Set<string>;
  expiresAt: number;
}

interface MemoryOnlineCounter {
  /** nickname → cantidad de sockets conectados */
  counters: Map<string, number>;
  expiresAt: number;
}

@Injectable()
export class ParticipantsCacheUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParticipantsCacheUseCase.name);
  private memoryOnline = new Map<string, MemoryOnlineEntry>();
  /** Contadores por conexión: `online:{token}` → nickname → count */
  private memoryOnlineCounters = new Map<string, MemoryOnlineCounter>();
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.gcInterval = setInterval(() => this.runMemoryGC(), 300000);
  }

  private runMemoryGC() {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.memoryOnline.entries()) {
      if (entry.expiresAt < now) {
        this.memoryOnline.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this.memoryOnlineCounters.entries()) {
      if (entry.expiresAt < now) {
        this.memoryOnlineCounters.delete(key);
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

  /**
   * Intenta ejecutar un comando Redis. Si falla por WRONGTYPE (schema antiguo),
   * borra la clave y reintenta. Si Redis no está disponible, cae a memoria.
   */
  private async redisMutate(
    key: string,
    fn: () => Promise<void>,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client) return false;

    try {
      await fn();
      return true;
    } catch (error: any) {
      // WRONGTYPE → la clave existe en formato SET (schema anterior), la migramos
      if (error?.message?.includes('WRONGTYPE')) {
        this.logger.warn(`[CACHE:MIGRATE] Migrando clave ${key} de SET a HASH`);
        await client.del(key);
        try {
          await fn();
          return true;
        } catch (retryErr) {
          this.logger.warn(`[CACHE:WARN] Fallo post-migración: ${retryErr}`);
        }
      } else {
        this.logger.warn(`[CACHE:WARN] Error Redis: ${error}`);
      }
    }
    return false;
  }

  /**
   * Lee un contador de Redis, con fallback a SMEMBERS si la clave es SET (schema antiguo).
   */
  private async redisReadCounters(key: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const client = this.redisService.getClient();
    if (!client) return result;

    try {
      // Intentar como HASH (formato nuevo)
      const fields = await client.hgetall(key);
      for (const [nickname, countStr] of Object.entries(fields)) {
        result.set(nickname, parseInt(countStr, 10) || 1);
      }
    } catch {
      // Fallback: leer como SET (formato antiguo) y migrar
      try {
        const members = await client.smembers(key);
        for (const nickname of members) {
          result.set(nickname, 1);
        }
        // Migrar a HASH: borrar SET y recrear como HASH
        if (members.length > 0) {
          this.logger.warn(
            `[CACHE:MIGRATE] Migrando online:${key} de SET a HASH (${members.length} miembros)`,
          );
          await client.del(key);
          for (const nickname of members) {
            await client.hincrby(key, nickname, 1);
          }
          await client.expire(key, 3600);
        }
      } catch {
        // Sin Redis, no hay datos
      }
    }
    return result;
  }

  /**
   * Registra una conexión de socket para el nickname.
   * Cada socket conectado suma 1 al contador.
   * El participante solo se considera "offline" cuando el contador llega a 0.
   */
  async addParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const historyKey = `history:${tokenCompartido}`;
    const client = this.redisService.getClient();

    // Intentar Redis primero
    const redisOk = await this.redisMutate(key, async () => {
      const newCount = await client!.hincrby(key, nickname, 1);
      if (newCount === 1) {
        await client!.sadd(historyKey, nickname);
        await client!.expire(historyKey, 14400);
      }
      await client!.expire(key, 3600);
    });

    if (redisOk) return;

    // Fallback en memoria
    let counterEntry = this.memoryOnlineCounters.get(key);
    if (!counterEntry) {
      counterEntry = {
        counters: new Map<string, number>(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      this.memoryOnlineCounters.set(key, counterEntry);
    }
    const current = counterEntry.counters.get(nickname) ?? 0;
    counterEntry.counters.set(nickname, current + 1);

    // History (con Set es idempotente)
    let histEntry = this.memoryOnline.get(historyKey);
    if (!histEntry) {
      histEntry = {
        participants: new Set<string>(),
        expiresAt: Date.now() + 14400 * 1000,
      };
      this.memoryOnline.set(historyKey, histEntry);
    }
    histEntry.participants.add(nickname);
  }

  /**
   * Desregistra UNA conexión de socket para el nickname.
   * Solo remueve al participante de la lista de online cuando
   * TODAS sus conexiones se cerraron (contador llega a 0).
   */
  async removeParticipantOnline(
    tokenCompartido: string,
    nickname: string,
  ): Promise<void> {
    const key = `online:${tokenCompartido}`;
    const client = this.redisService.getClient();

    // Intentar Redis primero
    const redisOk = await this.redisMutate(key, async () => {
      const newCount = await client!.hincrby(key, nickname, -1);
      if (newCount <= 0) {
        await client!.hdel(key, nickname);
      }
    });

    if (redisOk) return;

    // Fallback en memoria
    const counterEntry = this.memoryOnlineCounters.get(key);
    if (!counterEntry) return;

    const current = counterEntry.counters.get(nickname) ?? 0;
    if (current <= 1) {
      counterEntry.counters.delete(nickname);
    } else {
      counterEntry.counters.set(nickname, current - 1);
    }
  }

  /**
   * Devuelve los nicknames que tienen al menos una conexión activa.
   */
  async getOnlineParticipants(tokenCompartido: string): Promise<string[]> {
    const key = `online:${tokenCompartido}`;
    const participants = new Set<string>();

    // Leer desde memoria
    const memCounterEntry = this.memoryOnlineCounters.get(key);
    if (memCounterEntry) {
      for (const [nickname, count] of memCounterEntry.counters) {
        if (count > 0) participants.add(nickname);
      }
    }

    // Leer desde Redis (soporta SET y HASH)
    const redisCounters = await this.redisReadCounters(key);
    for (const [nickname, count] of redisCounters) {
      if (count > 0) participants.add(nickname);
    }

    return Array.from(participants);
  }

  async getHistoricalParticipants(tokenCompartido: string): Promise<string[]> {
    const historyKey = `history:${tokenCompartido}`;
    const participants = new Set<string>();

    const memEntry = this.memoryOnline.get(historyKey);
    if (memEntry) {
      for (const p of memEntry.participants) participants.add(p);
    }

    const client = this.redisService.getClient();
    if (client) {
      try {
        const data = await client.smembers(historyKey);
        for (const p of data) participants.add(p);
      } catch {
        this.logger.warn(`[CACHE:WARN] Fallo smembers Redis: ${historyKey}`);
      }
    }
    return Array.from(participants);
  }

  async getSessionParticipantCount(tokenCompartido: string): Promise<number> {
    const historyKey = `history:${tokenCompartido}`;
    const client = this.redisService.getClient();
    if (client) {
      try {
        return await client.scard(historyKey);
      } catch {
        return 0;
      }
    }
    const entry = this.memoryOnline.get(historyKey);
    return entry ? entry.participants.size : 0;
  }

  async checkAndSetDuplicate(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    if (client) {
      try {
        const added = await client.sadd(key, value);
        if (added === 1) {
          await client.expire(key, ttlSeconds);
          return true;
        }
        return false;
      } catch (error) {
        this.logger.warn(`[CACHE:WARN] Error SADD Redis: ${error}`);
      }
    }

    // Fallback memoria (aproximado)
    let entry = this.memoryOnline.get(key);
    if (!entry) {
      entry = {
        participants: new Set<string>(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      };
      this.memoryOnline.set(key, entry);
    }
    if (entry.participants.has(value)) return false;
    entry.participants.add(value);
    return true;
  }
}
