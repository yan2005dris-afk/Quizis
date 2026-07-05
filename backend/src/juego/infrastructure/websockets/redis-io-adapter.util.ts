import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const logger = new Logger('RedisAdapterFactory');

/**
 * Creates a @socket.io/redis-adapter instance using a dedicated pub/sub client pair.
 * The adapter requires its own blocking sub connection — it cannot share RedisService's
 * single command client.
 *
 * Returns null when REDIS_URL is not set (single-instance dev mode).
 */
export function createSocketIoRedisAdapter(
  redisUrl: string | undefined,
): ReturnType<typeof createAdapter> | null {
  if (!redisUrl) {
    logger.log('REDIS_URL not set, skipping adapter (single-instance mode)');
    return null;
  }

  const pubClient = new Redis(redisUrl);
  const subClient = pubClient.duplicate();

  logger.log('Redis adapter pub/sub client pair created');
  return createAdapter(pubClient, subClient);
}
