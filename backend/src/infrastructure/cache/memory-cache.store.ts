import { Logger } from '@nestjs/common';

/**
 * Almacenamiento en memoria con TTL y garbage collection automático.
 *
 * Útil como fallback cuando Redis no está disponible. Cada instancia
 * mantiene su propio Map con entradas que expiran automáticamente.
 *
 * @template T Tipo de dato almacenado en cada entrada.
 */
export class MemoryCacheStore<T = unknown> {
  protected readonly logger = new Logger(MemoryCacheStore.name);
  private store = new Map<string, { data: T; expiresAt: number }>();
  private gcInterval: NodeJS.Timeout | null = null;
  private readonly gcIntervalMs: number;

  constructor(gcIntervalMs = 300_000) {
    this.gcIntervalMs = gcIntervalMs;
    // Iniciamos el GC automáticamente ya que no es un provider gestionado por NestJS
    this.gcInterval = setInterval(() => this.runGC(), this.gcIntervalMs);
  }

  /**
   * Detiene el intervalo de recolección de basura.
   * Útil para limpieza manual si el objeto que lo contiene se destruye.
   */
  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
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

  entries(): Array<[string, T]> {
    const now = Date.now();
    const result: Array<[string, T]> = [];
    for (const [key, entry] of this.store) {
      if (entry.expiresAt >= now) result.push([key, entry.data]);
    }
    return result;
  }

  keys(): string[] {
    const now = Date.now();
    const result: string[] = [];
    for (const [key, entry] of this.store) {
      if (entry.expiresAt >= now) result.push(key);
    }
    return result;
  }
}
