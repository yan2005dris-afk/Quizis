import { Test, TestingModule } from '@nestjs/testing';
import { SocketMapService } from './socket-map.service';
import { RedisService } from 'src/core/database/redis/redis.service';

// Minimal Redis client mock
const makeRedisMock = () => ({
  hset: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue(null),
  hget: jest.fn().mockResolvedValue(null),
  hdel: jest.fn().mockResolvedValue(1),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  scard: jest.fn().mockResolvedValue(0),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
});

describe('SocketMapService — Redis path', () => {
  let service: SocketMapService;
  let redisMock: ReturnType<typeof makeRedisMock>;

  beforeEach(async () => {
    redisMock = makeRedisMock();

    const redisServiceMock: Partial<RedisService> = {
      getClient: jest.fn().mockReturnValue(redisMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketMapService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<SocketMapService>(SocketMapService);
  });

  describe('set()', () => {
    it('writes socket hash, reverse-index hash, and set', async () => {
      await service.set('socket-1', {
        tokenCompartido: 'room-A',
        nickname: 'alice',
      });

      expect(redisMock.hset).toHaveBeenCalledWith(
        'socket:socket-1',
        'tokenCompartido',
        'room-A',
        'nickname',
        'alice',
      );
      expect(redisMock.hset).toHaveBeenCalledWith(
        'room:room-A:nicknames',
        'alice',
        'socket-1',
      );
      expect(redisMock.sadd).toHaveBeenCalledWith(
        'room:room-A:sockets',
        'socket-1',
      );
    });

    it('sets TTL on all three keys', async () => {
      await service.set('socket-1', {
        tokenCompartido: 'room-A',
        nickname: 'alice',
      });

      const expireCalls = (redisMock.expire as jest.Mock).mock.calls.map(
        (c) => c[0],
      );
      expect(expireCalls).toContain('socket:socket-1');
      expect(expireCalls).toContain('room:room-A:nicknames');
      expect(expireCalls).toContain('room:room-A:sockets');
    });
  });

  describe('get()', () => {
    it('returns parsed data when key exists', async () => {
      redisMock.hgetall.mockResolvedValue({
        tokenCompartido: 'room-A',
        nickname: 'alice',
      });

      const result = await service.get('socket-1');

      expect(result).toEqual({ tokenCompartido: 'room-A', nickname: 'alice' });
      expect(redisMock.hgetall).toHaveBeenCalledWith('socket:socket-1');
    });

    it('returns null when key does not exist', async () => {
      redisMock.hgetall.mockResolvedValue(null);

      const result = await service.get('socket-missing');

      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('removes socket hash, sockets set entry, and nickname reverse index', async () => {
      redisMock.hgetall.mockResolvedValue({
        tokenCompartido: 'room-A',
        nickname: 'alice',
      });

      await service.delete('socket-1');

      expect(redisMock.srem).toHaveBeenCalledWith(
        'room:room-A:sockets',
        'socket-1',
      );
      expect(redisMock.hdel).toHaveBeenCalledWith(
        'room:room-A:nicknames',
        'alice',
      );
      expect(redisMock.del).toHaveBeenCalledWith('socket:socket-1');
    });

    it('does not throw when socket entry is already gone (TTL expired)', async () => {
      redisMock.hgetall.mockResolvedValue(null);

      await expect(service.delete('socket-missing')).resolves.not.toThrow();
      expect(redisMock.del).not.toHaveBeenCalled();
    });
  });

  describe('findSocketId()', () => {
    it('returns socketId from reverse index', async () => {
      redisMock.hget.mockResolvedValue('socket-1');

      const result = await service.findSocketId('alice', 'room-A');

      expect(result).toBe('socket-1');
      expect(redisMock.hget).toHaveBeenCalledWith(
        'room:room-A:nicknames',
        'alice',
      );
    });

    it('returns undefined when nickname not found', async () => {
      redisMock.hget.mockResolvedValue(null);

      const result = await service.findSocketId('unknown', 'room-A');

      expect(result).toBeUndefined();
    });
  });

  describe('getRoomSize()', () => {
    it('returns SCARD result', async () => {
      redisMock.scard.mockResolvedValue(3);

      const result = await service.getRoomSize('room-A');

      expect(result).toBe(3);
      expect(redisMock.scard).toHaveBeenCalledWith('room:room-A:sockets');
    });
  });
});

describe('SocketMapService — in-memory fallback (Redis null)', () => {
  let service: SocketMapService;

  beforeEach(async () => {
    const redisServiceMock: Partial<RedisService> = {
      getClient: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketMapService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<SocketMapService>(SocketMapService);
  });

  it('set + get round-trips through in-memory map', async () => {
    await service.set('s1', { tokenCompartido: 'tok', nickname: 'bob' });
    const result = await service.get('s1');
    expect(result).toEqual({ tokenCompartido: 'tok', nickname: 'bob' });
  });

  it('findSocketId resolves from in-memory map', async () => {
    await service.set('s1', { tokenCompartido: 'tok', nickname: 'bob' });
    const id = await service.findSocketId('bob', 'tok');
    expect(id).toBe('s1');
  });

  it('delete removes from in-memory map', async () => {
    await service.set('s1', { tokenCompartido: 'tok', nickname: 'bob' });
    await service.delete('s1');
    const result = await service.get('s1');
    expect(result).toBeNull();
  });

  it('getRoomSize counts from in-memory map', async () => {
    await service.set('s1', { tokenCompartido: 'tok', nickname: 'bob' });
    await service.set('s2', { tokenCompartido: 'tok', nickname: 'carol' });
    const size = await service.getRoomSize('tok');
    expect(size).toBe(2);
  });

  it('delete on unknown socket does not throw', async () => {
    await expect(service.delete('s-never-registered')).resolves.not.toThrow();
  });
});
