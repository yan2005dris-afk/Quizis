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
});
