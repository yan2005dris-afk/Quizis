import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../database/redis/redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
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

  it('should delegate get to redis client', async () => {
    mockRedisClient.get.mockResolvedValue('value');

    const result = await service.get('test:key');

    expect(redisService.getClient).toHaveBeenCalled();
    expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    expect(result).toBe('value');
  });

  it('should return null when redis client is unavailable on get', async () => {
    jest.spyOn(redisService, 'getClient').mockReturnValue(null);

    const result = await service.get('test:key');

    expect(result).toBeNull();
  });

  it('should delegate set to redis client with TTL', async () => {
    await service.set('test:key', 'value', 60);

    expect(mockRedisClient.set).toHaveBeenCalledWith('test:key', 'value', 'EX', 60);
  });

  it('should delegate del to redis client', async () => {
    await service.del('test:key');

    expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
  });
});
