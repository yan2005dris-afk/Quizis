import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService (Memory Cache Fallback - 2-Phase Persist)', () => {
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

  it('debe retornar un arreglo vacio si no hay votos en getVotes', async () => {
    const votes = await service.getVotes(99, 99);
    expect(votes).toEqual([]);
  });

  it('debe aislar los votos a procesar en prepareVotesForPersist', async () => {
    const rondaId = 1;
    const preguntaId = 15;

    await service.setVote(rondaId, preguntaId, 1, 101);
    await service.setVote(rondaId, preguntaId, 2, 102);

    const { processingKey, votes } = await service.prepareVotesForPersist(rondaId, preguntaId);
    expect(processingKey).toBe(`votes:${rondaId}:${preguntaId}:processing`);
    expect(votes).toHaveLength(2);
    expect(votes).toContainEqual({ participanteId: 1, opcionId: 101 });
    expect(votes).toContainEqual({ participanteId: 2, opcionId: 102 });

    // Los votos originales deben estar vacíos porque se aislaron/renombraron
    const originalVotes = await service.getVotes(rondaId, preguntaId);
    expect(originalVotes).toEqual([]);
  });

  it('debe eliminar la clave de procesamiento al confirmar con commitVotes', async () => {
    const rondaId = 1;
    const preguntaId = 20;

    await service.setVote(rondaId, preguntaId, 1, 201);
    const { processingKey } = await service.prepareVotesForPersist(rondaId, preguntaId);

    await service.commitVotes(processingKey);

    // No debe haber votos ni en procesamiento ni en el original
    const votes = await service.getVotes(rondaId, preguntaId);
    expect(votes).toEqual([]);
  });

  it('debe devolver y fusionar los votos al key original al llamar rollbackVotes', async () => {
    const rondaId = 1;
    const preguntaId = 30;

    // Voto inicial en caché
    await service.setVote(rondaId, preguntaId, 1, 301);
    
    // Aislar para persistir
    const { processingKey, votes } = await service.prepareVotesForPersist(rondaId, preguntaId);
    expect(votes).toHaveLength(1);

    // Llega un nuevo voto al key original mientras el otro está en ":processing"
    await service.setVote(rondaId, preguntaId, 2, 302);

    // Ocurre un fallo y se ejecuta rollback de los de procesamiento
    await service.rollbackVotes(processingKey, rondaId, preguntaId);

    // Los votos deben estar fusionados (el que falló + el nuevo que entró)
    const allVotes = await service.getVotes(rondaId, preguntaId);
    expect(allVotes).toHaveLength(2);
    expect(allVotes).toContainEqual({ participanteId: 1, opcionId: 301 });
    expect(allVotes).toContainEqual({ participanteId: 2, opcionId: 302 });
  });
});
