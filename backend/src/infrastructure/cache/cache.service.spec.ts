import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService (Memory Cache Fallback)', () => {
  let service: CacheService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'REDIS_HOST') return null; // Force Memory Fallback
        return undefined;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe almacenar y obtener votos correctamente en memoria', async () => {
    const rondaId = 1;
    const preguntaId = 10;
    const participanteId = 5;
    const opcionId = 2;

    await service.setVote(rondaId, preguntaId, participanteId, opcionId);
    
    const votes = await service.getVotes(rondaId, preguntaId);
    expect(votes).toHaveLength(1);
    expect(votes[0]).toEqual({ participanteId, opcionId });
  });

  it('debe retornar un arreglo vacio si no hay votos', async () => {
    const votes = await service.getVotes(99, 99);
    expect(votes).toEqual([]);
  });

  it('debe realizar un popVotes atómico (extraer y vaciar el caché)', async () => {
    const rondaId = 2;
    const preguntaId = 20;

    await service.setVote(rondaId, preguntaId, 1, 101);
    await service.setVote(rondaId, preguntaId, 2, 102);

    // popVotes debe obtener los votos
    const votes = await service.popVotes(rondaId, preguntaId);
    expect(votes).toHaveLength(2);
    expect(votes).toContainEqual({ participanteId: 1, opcionId: 101 });
    expect(votes).toContainEqual({ participanteId: 2, opcionId: 102 });

    // La segunda consulta a popVotes o getVotes debe retornar vacío porque ya se eliminaron
    const emptyVotes = await service.getVotes(rondaId, preguntaId);
    expect(emptyVotes).toEqual([]);
  });

  it('debe limpiar explícitamente los votos al llamar clearVotes', async () => {
    const rondaId = 3;
    const preguntaId = 30;

    await service.setVote(rondaId, preguntaId, 1, 201);
    await service.clearVotes(rondaId, preguntaId);

    const votes = await service.getVotes(rondaId, preguntaId);
    expect(votes).toEqual([]);
  });
});
