import { Test, TestingModule } from '@nestjs/testing';
import { RedisJuegoService } from './redis-juego.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infrastructure/cache/cache.service';

describe('RedisJuegoService', () => {
  let service: RedisJuegoService;
  let cacheService: jest.Mocked<Partial<CacheService>>;

  beforeEach(async () => {
    // Mockeamos las dependencias
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(7200),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisJuegoService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisJuegoService>(RedisJuegoService);
    cacheService = module.get(CacheService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería retornar true si el participante no ha votado', async () => {
    cacheService.get.mockResolvedValueOnce(null); // Simulamos que no hay voto previo

    const result = await service.registrarVoto(1, 1, 123);

    expect(result).toBe(true);
    expect(cacheService.set).toHaveBeenCalled(); // Verifica que se guardó el voto
  });

  it('debería retornar false si el participante ya votó', async () => {
    cacheService.get.mockResolvedValueOnce('true'); // Simulamos que YA votó

    const result = await service.registrarVoto(1, 1, 123);

    expect(result).toBe(false);
    expect(cacheService.set).not.toHaveBeenCalled(); // Verifica que NO se volvió a guardar
  });
});