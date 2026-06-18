/**
 * Integration tests for SocketMapService.
 *
 * Runs against a real Redis instance (localhost:6379 or REDIS_HOST env var).
 * No mocks — every assertion validates actual Redis state.
 *
 * Key isolation: all keys are prefixed with TEST_TOKEN so they can be
 * deleted atomically in afterEach without touching production data.
 */

import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { SocketMapService } from 'src/juego/infrastructure/websockets/socket-map.service';
import { RedisService } from 'src/core/database/redis/redis.service';

// ─── Test fixtures ──────────────────────────────────────────────────────────

const TEST_TOKEN = 'integration-test-room';
const SOCKET_A = 'socket-int-a';
const SOCKET_B = 'socket-int-b';
const NICK_A = 'PlayerA';
const NICK_B = 'PlayerB';

// Keys that SocketMapService writes for our test fixtures
const allTestKeys = [
  `socket:${SOCKET_A}`,
  `socket:${SOCKET_B}`,
  `room:${TEST_TOKEN}:nicknames`,
  `room:${TEST_TOKEN}:sockets`,
];

// ─── Minimal RedisService stub ──────────────────────────────────────────────

/**
 * Wraps a live ioredis client in the RedisService interface so
 * SocketMapService can be instantiated without the NestJS DI container.
 */
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

async function waitForRedis(client: Redis, retries = 5, delayMs = 300): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await client.ping();
      return;
    } catch {
      if (i === retries - 1) throw new Error(`Redis not reachable after ${retries} attempts`);
      await new Promise<void>((r) => setTimeout(r, delayMs));
    }
  }
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('SocketMapService @integration', () => {
  let client: Redis;
  let service: SocketMapService;

  beforeAll(async () => {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    client = new Redis({ host, port, connectTimeout: 5000, maxRetriesPerRequest: 0 });

    // Fail fast if Redis is not reachable (retries handle brief startup lag in CI)
    await waitForRedis(client);

    const stub = new StubRedisService(client) as unknown as RedisService;
    service = new SocketMapService(stub);

    // Silence NestJS Logger noise in test output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await client.quit();
  });

  afterEach(async () => {
    // Delete all keys written by these tests — keeps each test isolated
    if (allTestKeys.length > 0) {
      await client.del(...allTestKeys);
    }
  });

  // ─── set / get ────────────────────────────────────────────────────────────

  describe('set() then get()', () => {
    it('returns the stored data for an existing socketId', async () => {
      await service.set(SOCKET_A, { tokenCompartido: TEST_TOKEN, nickname: NICK_A });

      const result = await service.get(SOCKET_A);

      expect(result).toEqual({ tokenCompartido: TEST_TOKEN, nickname: NICK_A });
    });

    it('returns null for an unknown socketId', async () => {
      const result = await service.get('nonexistent-socket-id');
      expect(result).toBeNull();
    });
  });

  // ─── findSocketId ─────────────────────────────────────────────────────────

  describe('findSocketId()', () => {
    it('returns the correct socketId via the reverse HGET index', async () => {
      await service.set(SOCKET_A, { tokenCompartido: TEST_TOKEN, nickname: NICK_A });

      const found = await service.findSocketId(NICK_A, TEST_TOKEN);

      expect(found).toBe(SOCKET_A);
    });

    it('returns undefined for a nickname not in the room', async () => {
      const found = await service.findSocketId('GhostPlayer', TEST_TOKEN);
      expect(found).toBeUndefined();
    });
  });

  // ─── getRoomSize ──────────────────────────────────────────────────────────

  describe('getRoomSize()', () => {
    it('returns 2 after two set() calls for the same room', async () => {
      await service.set(SOCKET_A, { tokenCompartido: TEST_TOKEN, nickname: NICK_A });
      await service.set(SOCKET_B, { tokenCompartido: TEST_TOKEN, nickname: NICK_B });

      const size = await service.getRoomSize(TEST_TOKEN);

      expect(size).toBe(2);
    });

    it('returns 0 for a room with no registered sockets', async () => {
      const size = await service.getRoomSize('empty-room-token');
      expect(size).toBe(0);
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('removes socket hash, room:sockets SET entry, and room:nicknames HASH entry', async () => {
      await service.set(SOCKET_A, { tokenCompartido: TEST_TOKEN, nickname: NICK_A });

      await service.delete(SOCKET_A);

      // socket hash must be gone
      const socketHash = await client.hgetall(`socket:${SOCKET_A}`);
      expect(Object.keys(socketHash)).toHaveLength(0);

      // SET must not contain the socketId
      const inSet = await client.sismember(`room:${TEST_TOKEN}:sockets`, SOCKET_A);
      expect(inSet).toBe(0);

      // nicknames hash must not contain the nickname
      const nickEntry = await client.hget(`room:${TEST_TOKEN}:nicknames`, NICK_A);
      expect(nickEntry).toBeNull();
    });

    it('does not throw and does not affect other sockets when deleting a second socket from the same room', async () => {
      await service.set(SOCKET_A, { tokenCompartido: TEST_TOKEN, nickname: NICK_A });
      await service.set(SOCKET_B, { tokenCompartido: TEST_TOKEN, nickname: NICK_B });

      await service.delete(SOCKET_A);

      // SOCKET_B must still be present
      const remaining = await service.getRoomSize(TEST_TOKEN);
      expect(remaining).toBe(1);

      const socketBHash = await service.get(SOCKET_B);
      expect(socketBHash).toEqual({ tokenCompartido: TEST_TOKEN, nickname: NICK_B });
    });

    it('logs and does not throw when deleting an unknown/expired socketId', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await expect(service.delete('unknown-socket-xyz')).resolves.not.toThrow();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No entry for unknown-socket-xyz'),
      );
    });
  });
});
