import { Test, TestingModule } from '@nestjs/testing';
import { RedisJuegoService } from './redis-juego.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infrastructure/cache/cache.service'; // Asegura la ruta

describe('RedisJuegoService', () => {
  let service: RedisJuegoService;
  let cacheService: CacheService;

  // 1. Patrón: Creamos objetos mock para los servicios
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisJuegoService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisJuegoService>(RedisJuegoService);
    cacheService = module.get<CacheService>(CacheService);
    
    // Limpiamos los mocks antes de cada test para que no se contaminen
    jest.clearAllMocks();
  });

  // 2. Patrón: Bloque describe para cada método
  describe('registrarVoto', () => {
    
    it('debe retornar true si el participante no ha votado', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const participanteId = 5;

      // Configuramos el valor que devuelve el mock
      mockCacheService.get.mockResolvedValue(null); // No ha votado
      mockConfigService.get.mockReturnValue(7200);

      const result = await service.registrarVoto(rondaId, preguntaId, participanteId);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('debe retornar false si el participante ya votó', async () => {
      mockCacheService.get.mockResolvedValue('true'); // Ya votó

      const result = await service.registrarVoto(1, 10, 5);

      expect(result).toBe(false);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('debe retornar false si hay un error en Redis (try/catch)', async () => {
      // Simulamos un error de red
      mockCacheService.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.registrarVoto(1, 10, 5);

      expect(result).toBe(false);
    });
  });
});