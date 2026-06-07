import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

/**
 * Almacenamiento en memoria con TTL y garbage collection automático.
 *
 * Útil como fallback cuando Redis no está disponible. Cada instancia
 * mantiene su propio Map con entradas que expiran automáticamente.
 *
 * @template T Tipo de dato almacenado en cada entrada.
 */
@Injectable()
export class MemoryCacheStore<T = unknown>
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(MemoryCacheStore.name);
  private store = new Map<string, { data: T; expiresAt: number }>();
  private gcInterval: NodeJS.Timeout | null = null;
  private readonly gcIntervalMs: number;

  constructor(gcIntervalMs = 300_000) {
    this.gcIntervalMs = gcIntervalMs;
  }

  onModuleInit(): void {
    this.gcInterval = setInterval(() => this.runGC(), this.gcIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.gcInterval) clearInterval(this.gcInterval);
  }

  private runGC(): void {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`[MEM:GC] Liberadas ${count} entradas expiradas.`);
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
  }

  /** Itera sobre todas las entradas no expiradas del store. */
  entries(): IterableIterator<[string, { data: T; expiresAt: number }]> {
    return this.store.entries();
  }

  /** Itera sobre todas las claves no expiradas del store. */
  keys(): IterableIterator<string> {
    return this.store.keys();
  }
}
