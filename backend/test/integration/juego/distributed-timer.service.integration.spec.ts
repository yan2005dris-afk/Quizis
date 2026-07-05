/**
 * Integration tests for DistributedTimerService.
 *
 * Runs against a real Redis instance (localhost:6379 or REDIS_HOST env var).
 * No mocks — lock state is verified directly through the ioredis client.
 *
 * Short TTLs (3 s) are used so tests don't stall waiting for natural expiry.
 * All lock keys are prefixed with 'integration-timer-' and deleted in afterAll.
 */

import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { DistributedTimerService } from 'src/juego/infrastructure/websockets/distributed-timer.service';
import { RedisService } from 'src/core/database/redis/redis.service';

// ─── Test fixtures ──────────────────────────────────────────────────────────

const TOKEN_LOCK = 'integration-timer-lock';
const TOKEN_OWNER = 'integration-timer-owner';

const lockKey = (token: string) => `timer:${token}:owner`;

const TEST_KEYS = [lockKey(TOKEN_LOCK), lockKey(TOKEN_OWNER)];

// ─── Minimal RedisService stub ──────────────────────────────────────────────

class StubRedisService {
  constructor(private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  isHealthyStatus(): boolean {
    return true;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function waitForRedis(
  client: Redis,
  retries = 5,
  delayMs = 300,
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await client.ping();
      return;
    } catch {
      if (i === retries - 1)
        throw new Error(`Redis not reachable after ${retries} attempts`);
      await new Promise<void>((r) => setTimeout(r, delayMs));
    }
  }
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('DistributedTimerService @integration', () => {
  let client: Redis;
  let service: DistributedTimerService;

  beforeAll(async () => {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    client = new Redis({
      host,
      port,
      connectTimeout: 5000,
      maxRetriesPerRequest: 0,
    });

    await waitForRedis(client);

    const stub = new StubRedisService(client) as unknown as RedisService;
    service = new DistributedTimerService(stub);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (TEST_KEYS.length > 0) {
      await client.del(...TEST_KEYS);
    }
    await client.quit();
  });

  afterEach(async () => {
    // Stop any running interval so tests don't bleed ticks into each other
    await service.detenerTimer(TOKEN_LOCK);
    await service.detenerTimer(TOKEN_OWNER);
    // Ensure lock keys are clean regardless of who owns them
    if (TEST_KEYS.length > 0) {
      await client.del(...TEST_KEYS);
    }
  });

  // ─── iniciarTimer — NX acquire ────────────────────────────────────────────

  describe('iniciarTimer()', () => {
    it('writes timer:{token}:owner lock key to Redis after acquiring', async () => {
      await service.iniciarTimer(
        TOKEN_LOCK,
        3,
        () => {},
        () => {},
      );

      const value = await client.get(lockKey(TOKEN_LOCK));

      expect(value).toBe(service.instanceId);
    });

    it('lock key has a positive TTL (not persistent)', async () => {
      await service.iniciarTimer(
        TOKEN_LOCK,
        3,
        () => {},
        () => {},
      );

      const ttl = await client.ttl(lockKey(TOKEN_LOCK));

      // TTL = segundos (3) + LOCK_TTL_BUFFER (5) = 8 s; must be > 0 and <= 8
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(8);
    });

    it('does NOT overwrite an existing lock (NX miss) when another instance holds it', async () => {
      // Simulate another instance holding the lock by writing a foreign instanceId directly
      const foreignInstanceId = 'foreign-instance-uuid-9999';
      await client.set(lockKey(TOKEN_LOCK), foreignInstanceId, 'EX', 60);

      // Count intervals before — DistributedTimerService does not expose interval
      // count publicly, so we verify via Redis: the lock value must remain foreign.
      const noop = jest.fn();
      await service.iniciarTimer(TOKEN_LOCK, 3, noop, noop);

      const valueAfter = await client.get(lockKey(TOKEN_LOCK));

      // Lock value must be unchanged — our service must not have overwritten it
      expect(valueAfter).toBe(foreignInstanceId);

      // onTick/onExpire callbacks must never be called because NX failed
      // (iniciarTimer returns early without starting the interval)
      expect(noop).not.toHaveBeenCalled();
    });
  });

  // ─── detenerTimer — Lua atomic DEL ────────────────────────────────────────

  describe('detenerTimer()', () => {
    it('deletes the lock key when this instance owns it', async () => {
      await service.iniciarTimer(
        TOKEN_LOCK,
        3,
        () => {},
        () => {},
      );

      // Confirm lock is held before stopping
      const before = await client.get(lockKey(TOKEN_LOCK));
      expect(before).toBe(service.instanceId);

      await service.detenerTimer(TOKEN_LOCK);

      const after = await client.exists(lockKey(TOKEN_LOCK));
      expect(after).toBe(0);
    });

    it('does NOT delete the lock when instanceId does not match (another owner)', async () => {
      const foreignInstanceId = 'foreign-instance-uuid-8888';
      await client.set(lockKey(TOKEN_OWNER), foreignInstanceId, 'EX', 60);

      // Call detenerTimer on a service instance that does NOT own this key
      await service.detenerTimer(TOKEN_OWNER);

      // Lua guard: redis.call('get',KEYS[1])==ARGV[1] is false — key stays
      const remaining = await client.get(lockKey(TOKEN_OWNER));
      expect(remaining).toBe(foreignInstanceId);
    });

    it('resolves without throwing when lock key does not exist', async () => {
      // Key never written — detenerTimer should be a no-op
      await expect(
        service.detenerTimer('ghost-token-xyz'),
      ).resolves.not.toThrow();
    });
  });
});
