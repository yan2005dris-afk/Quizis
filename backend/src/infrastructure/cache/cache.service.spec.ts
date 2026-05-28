import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../database/redis/redis.service';
import { Logger } from '@nestjs/common';

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

  describe('get', () => {
    it('debería delegar get al cliente Redis', async () => {
      mockRedisClient.get.mockResolvedValue('valor');

      const result = await service.get('test:key');

      expect(redisService.getClient).toHaveBeenCalled();

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'test:key',
      );

      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);

      expect(result).toBe('valor');
    });

    it('debería retornar null si Redis no está disponible', async () => {
      jest.spyOn(redisService, 'getClient').mockReturnValue(null);

      const result = await service.get('test:key');

      expect(result).toBeNull();
    });

    it('debería manejar errores de Redis en get sin romper la aplicación', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      mockRedisClient.get.mockRejectedValue(
        new Error('Redis Error'),
      );

      const result = await service.get('test:key');

      expect(result).toBeNull();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('debería delegar set al cliente Redis con TTL', async () => {
      await service.set('test:key', 'valor', 60);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:key',
        'valor',
        'EX',
        60,
      );

      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
    });

    it('no debería lanzar errores si Redis no está disponible', async () => {
      jest.spyOn(redisService, 'getClient').mockReturnValue(null);

      await expect(
        service.set('test:key', 'valor', 60),
      ).resolves.not.toThrow();
    });

    it('debería manejar errores de Redis en set sin romper la aplicación', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      mockRedisClient.set.mockRejectedValue(
        new Error('Redis Error'),
      );

      await expect(
        service.set('test:key', 'valor', 60),
      ).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

});
