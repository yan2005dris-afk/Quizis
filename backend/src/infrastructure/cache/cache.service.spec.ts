import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../database/redis/redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('debería delegar get al cliente redis', async () => {
    mockRedisClient.get.mockResolvedValue('valor');

    const result = await service.get('test:key');

    expect(redisService.getClient).toHaveBeenCalled();
    expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    expect(result).toBe('valor');
  });

  it('debería delegar set al cliente redis con TTL', async () => {
    await service.set('test:key', 'valor', 60);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'test:key',
      'valor',
      'EX',
      60,
    );
  });

  it('debe guardar, obtener, refrescar y remover una sesión socket', async () => {
    const token = 'sala-token';
    const nickname = 'player1';
    const socketId = 'socket-id-123';

    await service.saveSocketSession(token, nickname, socketId);

    const retrievedSocketId = await service.getSocketId(token, nickname);
    expect(retrievedSocketId).toBe(socketId);

    // Guardar el expiresAt original de la memoria para verificar el refresco
    const clientKey = `socket:client:${socketId}`;
    const initialExpiry = service['memoryClientSockets'].get(clientKey)?.expiresAt;
    expect(initialExpiry).toBeDefined();

    // Adelantar el tiempo de expiración simulando que pasó tiempo
    if (initialExpiry) {
      service['memoryClientSockets'].get(clientKey)!.expiresAt = initialExpiry - 10000;
      const sessionKey = `socket:session:${token}:${nickname}`;
      service['memorySocketSessions'].get(sessionKey)!.expiresAt = initialExpiry - 10000;
    }

    await service.refreshSocketSession(socketId);

    const refreshedExpiry = service['memoryClientSockets'].get(clientKey)?.expiresAt;
    expect(refreshedExpiry).toBeGreaterThan(initialExpiry! - 10000);

    const removedSession = await service.removeSocketSession(socketId);
    expect(removedSession).toEqual({ token, nickname });

    const retrievedAfterRemove = await service.getSocketId(token, nickname);
    expect(retrievedAfterRemove).toBeNull();
  });
});
