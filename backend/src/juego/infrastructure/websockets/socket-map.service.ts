import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/core/database/redis/redis.service';

const SOCKET_TTL_SECONDS = 86400; // 24h

@Injectable()
export class SocketMapService {
  private readonly logger = new Logger(SocketMapService.name);

  /**
   * In-memory fallback when Redis is unavailable.
   * Keys: socketId → { tokenCompartido, nickname }
   */
  private readonly memoryMap = new Map<
    string,
    { tokenCompartido: string; nickname: string }
  >();

  constructor(private readonly redisService: RedisService) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Register a socket entry on join.
   * Writes:
   *   socket:{socketId}           Hash  { tokenCompartido, nickname }
   *   room:{token}:nicknames      Hash  { nickname: socketId }
   *   room:{token}:sockets        Set   { socketId }
   * All keys receive a 24h TTL.
   */
  async set(
    socketId: string,
    data: { tokenCompartido: string; nickname: string },
  ): Promise<void> {
    const client = this.redisService.getClient();

    if (!client) {
      this.memoryMap.set(socketId, data);
      return;
    }

    try {
      const { tokenCompartido, nickname } = data;

      await client.hset(
        `socket:${socketId}`,
        'tokenCompartido',
        tokenCompartido,
        'nickname',
        nickname,
      );
      await client.expire(`socket:${socketId}`, SOCKET_TTL_SECONDS);

      await client.hset(
        `room:${tokenCompartido}:nicknames`,
        nickname,
        socketId,
      );
      await client.expire(
        `room:${tokenCompartido}:nicknames`,
        SOCKET_TTL_SECONDS,
      );

      await client.sadd(`room:${tokenCompartido}:sockets`, socketId);
      await client.expire(
        `room:${tokenCompartido}:sockets`,
        SOCKET_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `[SocketMapService.set] Redis error — falling back to memory: ${error}`,
      );
      this.memoryMap.set(socketId, data);
    }
  }

  /**
   * Retrieve socket entry by socketId.
   * Returns null when not found (unknown socket or TTL expired).
   */
  async get(
    socketId: string,
  ): Promise<{ tokenCompartido: string; nickname: string } | null> {
    const client = this.redisService.getClient();

    if (!client) {
      return this.memoryMap.get(socketId) ?? null;
    }

    try {
      const raw = await client.hgetall(`socket:${socketId}`);
      if (!raw || !raw.tokenCompartido) return null;
      return { tokenCompartido: raw.tokenCompartido, nickname: raw.nickname };
    } catch (error) {
      this.logger.warn(
        `[SocketMapService.get] Redis error — falling back to memory: ${error}`,
      );
      return this.memoryMap.get(socketId) ?? null;
    }
  }

  /**
   * Remove a socket entry on disconnect.
   * Reads the hash first to get tokenCompartido + nickname for reverse-index cleanup.
   * If null (TTL expired), logs and continues — does not throw.
   */
  async delete(socketId: string): Promise<void> {
    const client = this.redisService.getClient();

    if (!client) {
      this.memoryMap.delete(socketId);
      return;
    }

    try {
      const entry = await this.get(socketId);
      if (!entry) {
        this.logger.log(
          `[SocketMapService.delete] No entry for ${socketId} (already expired or unknown)`,
        );
        return;
      }

      const { tokenCompartido, nickname } = entry;

      await client.srem(`room:${tokenCompartido}:sockets`, socketId);
      await client.hdel(`room:${tokenCompartido}:nicknames`, nickname);
      await client.del(`socket:${socketId}`);
    } catch (error) {
      this.logger.warn(
        `[SocketMapService.delete] Redis error — falling back to memory: ${error}`,
      );
      this.memoryMap.delete(socketId);
    }
  }

  /**
   * O(1) reverse lookup: nickname → socketId using per-room Hash.
   * Returns undefined when nickname is not in the room.
   */
  async findSocketId(
    nickname: string,
    tokenCompartido: string,
  ): Promise<string | undefined> {
    const client = this.redisService.getClient();

    if (!client) {
      for (const [socketId, info] of this.memoryMap.entries()) {
        if (
          info.nickname === nickname &&
          info.tokenCompartido === tokenCompartido
        ) {
          return socketId;
        }
      }
      return undefined;
    }

    try {
      const socketId = await client.hget(
        `room:${tokenCompartido}:nicknames`,
        nickname,
      );
      return socketId ?? undefined;
    } catch (error) {
      this.logger.warn(
        `[SocketMapService.findSocketId] Redis error — falling back to memory: ${error}`,
      );
      for (const [socketId, info] of this.memoryMap.entries()) {
        if (
          info.nickname === nickname &&
          info.tokenCompartido === tokenCompartido
        ) {
          return socketId;
        }
      }
      return undefined;
    }
  }

  /**
   * Returns the number of sockets currently registered in the room.
   * Used to detect empty-room condition.
   */
  async getRoomSize(tokenCompartido: string): Promise<number> {
    const client = this.redisService.getClient();

    if (!client) {
      let count = 0;
      for (const info of this.memoryMap.values()) {
        if (info.tokenCompartido === tokenCompartido) count++;
      }
      return count;
    }

    try {
      return await client.scard(`room:${tokenCompartido}:sockets`);
    } catch (error) {
      this.logger.warn(
        `[SocketMapService.getRoomSize] Redis error — falling back to memory: ${error}`,
      );
      let count = 0;
      for (const info of this.memoryMap.values()) {
        if (info.tokenCompartido === tokenCompartido) count++;
      }
      return count;
    }
  }
}
