import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/core/database/redis/redis.service';

/**
 * Lock TTL = timer seconds + 5s buffer.
 * Must exceed the 1s tick interval so a slow tick never self-expires.
 */
const LOCK_TTL_BUFFER = 5;

@Injectable()
export class DistributedTimerService {
  private readonly logger = new Logger(DistributedTimerService.name);

  /**
   * Stable identity for this process instance.
   * Used to guard the DEL operation — only the lock owner may release.
   */
  readonly instanceId: string = randomUUID();

  /** Active intervals keyed by room token. */
  private readonly intervals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redisService: RedisService) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Start a distributed countdown timer for a room.
   *
   * Acquires an NX lock before starting the local setInterval.
   * If the lock is already held by another instance, returns immediately
   * without starting a local interval (exactly-once guarantee).
   *
   * @param token       Room token used as part of the lock key
   * @param segundos    Countdown duration in seconds
   * @param onTick      Called on each tick with remaining seconds (including initial)
   * @param onExpire    Called once when the countdown reaches 0
   */
  async iniciarTimer(
    token: string,
    segundos: number,
    onTick: (remaining: number) => void,
    onExpire: () => void,
  ): Promise<void> {
    // Clear any existing interval for this token first
    this._clearInterval(token);

    if (segundos <= 0) return;

    const client = this.redisService.getClient();
    const lockKey = `timer:${token}:owner`;
    const lockTtl = segundos + LOCK_TTL_BUFFER;

    if (client) {
      // SET EX <ttl> NX — atomic acquire (ioredis v5 argument order)
      const acquired = await client.set(
        lockKey,
        this.instanceId,
        'EX',
        lockTtl,
        'NX',
      );
      if (acquired === null) {
        // Another instance owns the lock — do not start local interval
        this.logger.log(
          `[DistributedTimer] Lock already held for room ${token}, skipping`,
        );
        return;
      }
      this.logger.log(
        `[DistributedTimer] Lock acquired for room ${token} (${segundos}s)`,
      );
    } else {
      // No Redis — behave as sole owner (single-instance dev mode)
      this.logger.log(
        `[DistributedTimer] No Redis — running as sole owner for room ${token}`,
      );
    }

    let remaining = segundos;
    onTick(remaining); // initial tick

    const interval = setInterval(async () => {
      remaining -= 1;
      onTick(remaining);

      if (client) {
        // Per-tick renewal: reset the TTL to prevent expiry between ticks
        const renewed = await client.expire(lockKey, lockTtl);
        if (renewed === 0) {
          // Lock lost (key gone) — stop interval
          this.logger.warn(
            `[DistributedTimer] Lock lost for room ${token}, stopping interval`,
          );
          this._clearInterval(token);
          return;
        }
      }

      if (remaining <= 0) {
        await this.detenerTimer(token);
        onExpire();
      }
    }, 1000);

    this.intervals.set(token, interval);
  }

  /**
   * Stop the timer for a room.
   * Clears the local interval and DELs the lock key only if this instance owns it.
   */
  async detenerTimer(token: string): Promise<void> {
    this._clearInterval(token);

    const client = this.redisService.getClient();
    if (!client) return;

    try {
      const lockKey = `timer:${token}:owner`;
      const released = await client.eval(
        `if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end`,
        1,
        lockKey,
        this.instanceId,
      );
      if (released === 1) {
        this.logger.log(`[DistributedTimer] Lock released for room ${token}`);
      }
    } catch (error) {
      this.logger.warn(`[DistributedTimer.detenerTimer] Redis error: ${error}`);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _clearInterval(token: string): void {
    const existing = this.intervals.get(token);
    if (existing) {
      clearInterval(existing);
      this.intervals.delete(token);
    }
  }
}
