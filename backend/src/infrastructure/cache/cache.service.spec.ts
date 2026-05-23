import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService (Memory Fallback - Robust Self-Healing)', () => {
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

  it('debe almacenar y obtener votos con getVotes', async () => {
    const rondaId = 1;
    const preguntaId = 10;
    
    await service.setVote(rondaId, preguntaId, 5, 2);
    
    const votes = await service.getVotes(rondaId, preguntaId);
    expect(votes).toHaveLength(1);
    expect(votes[0]).toEqual({ participanteId: 5, opcionId: 2 });
  });

  it('debe aislar los votos en una clave única con timestamp al preparar persistencia', async () => {
    const rondaId = 1;
    const preguntaId = 15;

    await service.setVote(rondaId, preguntaId, 1, 101);
    await service.setVote(rondaId, preguntaId, 2, 102);

    const { processingKey, votes } = await service.prepareVotesForPersist(rondaId, preguntaId);
    expect(processingKey).toContain(`votes:${rondaId}:${preguntaId}:processing:`);
    expect(votes).toHaveLength(2);
    expect(votes).toContainEqual({ participanteId: 1, opcionId: 101 });
    expect(votes).toContainEqual({ participanteId: 2, opcionId: 102 });

    // Los votos originales deben estar vacíos porque se renombraron/aislaron
    const originalVotes = await service.getVotes(rondaId, preguntaId);
    expect(originalVotes).toEqual([]);
  });

  it('debe eliminar la clave temporal de procesamiento al confirmar con commitVotes', async () => {
    const rondaId = 1;
    const preguntaId = 20;

    await service.setVote(rondaId, preguntaId, 1, 201);
    const { processingKey } = await service.prepareVotesForPersist(rondaId, preguntaId);

    await service.commitVotes(processingKey);

    const votes = await service.getVotes(rondaId, preguntaId);
    expect(votes).toEqual([]);
  });

  it('debe realizar rollback fusionando los votos en procesamiento de vuelta a la clave original', async () => {
    const rondaId = 1;
    const preguntaId = 30;

    // Voto original
    await service.setVote(rondaId, preguntaId, 1, 301);
    
    // Aislar
    const { processingKey } = await service.prepareVotesForPersist(rondaId, preguntaId);

    // Llega un voto nuevo a la cola original mientras el otro está en processing
    await service.setVote(rondaId, preguntaId, 2, 302);

    // Fallo en persistencia, ejecutar rollback
    await service.rollbackVotes(processingKey, rondaId, preguntaId);

    // Deben haberse fusionado el voto del rollback y el voto nuevo
    const allVotes = await service.getVotes(rondaId, preguntaId);
    expect(allVotes).toHaveLength(2);
    expect(allVotes).toContainEqual({ participanteId: 1, opcionId: 301 });
    expect(allVotes).toContainEqual({ participanteId: 2, opcionId: 302 });
  });

  it('debe autoconmutar y fusionar votos huérfanos de caídas anteriores (Self-Healing)', async () => {
    const rondaId = 1;
    const preguntaId = 40;
    const procPrefix = `votes:${rondaId}:${preguntaId}:processing:`;

    // Simulamos un crash anterior dejando un key ":processing:1111" huérfano en caché
    const oldProcKey = `${procPrefix}1111`;
    const oldMap = new Map<number, number>();
    oldMap.set(8, 88); // Voto antiguo que quedó atascado
    
    service['memoryVotes'].set(oldProcKey, {
      votes: oldMap,
      expiresAt: Date.now() + 3600 * 1000,
    });

    // Registramos un voto en el flujo actual
    await service.setVote(rondaId, preguntaId, 9, 99);

    // Preparamos para persistir
    const { votes } = await service.prepareVotesForPersist(rondaId, preguntaId);

    // Deben haberse recuperado y fusionado ambos votos (el atascado y el actual)
    expect(votes).toHaveLength(2);
    expect(votes).toContainEqual({ participanteId: 8, opcionId: 88 });
    expect(votes).toContainEqual({ participanteId: 9, opcionId: 99 });
  });

  it('debe limpiar claves expiradas al ejecutar el Recolector de Basura (GC) en memoria', async () => {
    const rondaId = 1;
    const preguntaId = 50;
    const key = `votes:${rondaId}:${preguntaId}`;

    // Insertar un voto expirado
    const expiredMap = new Map<number, number>();
    expiredMap.set(10, 100);
    service['memoryVotes'].set(key, {
      votes: expiredMap,
      expiresAt: Date.now() - 1000, // Expirado hace 1 segundo
    });

    // Insertar un voto válido
    await service.setVote(rondaId, 55, 11, 200);

    // Correr colector de basura manualmente
    service['runMemoryGC']();

    // El expirado debió haberse eliminado
    const expiredVotes = await service.getVotes(rondaId, preguntaId);
    expect(expiredVotes).toEqual([]);

    // El válido debe seguir existiendo
    const validVotes = await service.getVotes(rondaId, 55);
    expect(validVotes).toHaveLength(1);
  });
});
