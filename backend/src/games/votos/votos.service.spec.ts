import { Test } from '@nestjs/testing';
import { VotosService } from './votos.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

describe('VotosService (2-Phase Persist)', () => {
  let service: VotosService;
  let cacheService: CacheService;
  let prismaService: PrismaService;

  const mockCacheService = {
    setVote: jest.fn(),
    getVotes: jest.fn(),
    prepareVotesForPersist: jest.fn(),
    commitVotes: jest.fn(),
    rollbackVotes: jest.fn(),
  };

  const mockPrismaService = {
    votosPublico: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VotosService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VotosService>(VotosService);
    cacheService = module.get<CacheService>(CacheService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registrarVoto', () => {
    it('debe registrar el voto de manera ultra rápida en caché sin llamadas a PostgreSQL', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const participanteId = 5;
      const opcionId = 2;

      await service.registrarVoto(
        rondaId,
        preguntaId,
        participanteId,
        opcionId,
      );

      expect(cacheService.setVote).toHaveBeenCalledWith(
        rondaId,
        preguntaId,
        participanteId,
        opcionId,
      );
      expect(prismaService.votosPublico.createMany).not.toHaveBeenCalled();
    });
  });

  describe('persistirVotos', () => {
    it('debe retornar count=0 si no hay votos aislados en prepareVotesForPersist', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: 'votes:1:10:processing:12345',
        votes: [],
      });

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(cacheService.prepareVotesForPersist).toHaveBeenCalledWith(
        rondaId,
        preguntaId,
      );
      expect(prismaService.votosPublico.createMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0 });
    });

    it('debe confirmar con commitVotes y retornar la cantidad si el bulk insert tiene éxito', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const mockVotes = [{ participanteId: 5, opcionId: 2 }];
      const procKey = 'votes:1:10:processing:12345';
      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: procKey,
        votes: mockVotes,
      });
      mockPrismaService.votosPublico.createMany.mockResolvedValue({ count: 1 });

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(cacheService.prepareVotesForPersist).toHaveBeenCalledWith(
        rondaId,
        preguntaId,
      );
      expect(prismaService.votosPublico.createMany).toHaveBeenCalledWith({
        data: [{ rondaId, preguntaId, participanteId: 5, opcionId: 2 }],
        skipDuplicates: true,
      });
      expect(cacheService.commitVotes).toHaveBeenCalledWith(procKey);
      expect(cacheService.rollbackVotes).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 1 });
    });

    it('debe revertir y realizar un rollback de los votos si el bulk insert a PostgreSQL falla', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const mockVotes = [{ participanteId: 5, opcionId: 2 }];
      const procKey = 'votes:1:10:processing:12345';

      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: procKey,
        votes: mockVotes,
      });
      mockPrismaService.votosPublico.createMany.mockRejectedValue(
        new Error('Postgres is down'),
      );

      await expect(service.persistirVotos(rondaId, preguntaId)).rejects.toThrow(
        'Postgres is down',
      );

      expect(cacheService.prepareVotesForPersist).toHaveBeenCalledWith(
        rondaId,
        preguntaId,
      );
      expect(prismaService.votosPublico.createMany).toHaveBeenCalled();
      expect(cacheService.rollbackVotes).toHaveBeenCalledWith(
        procKey,
        rondaId,
        preguntaId,
      );
      expect(cacheService.commitVotes).not.toHaveBeenCalled();
    });

    it('debe ignorar votos duplicados usando skipDuplicates', async () => {
      const rondaId = 1;
      const preguntaId = 10;

      const mockVotes = [
        { participanteId: 5, opcionId: 2 },
        { participanteId: 5, opcionId: 2 }, // duplicado
      ];

      const procKey = 'votes:1:10:processing:duplicate';

      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: procKey,
        votes: mockVotes,
      });

      // PostgreSQL inserta solo 1
      mockPrismaService.votosPublico.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(prismaService.votosPublico.createMany).toHaveBeenCalledWith({
        data: [
          {
            rondaId,
            preguntaId,
            participanteId: 5,
            opcionId: 2,
          },
          {
            rondaId,
            preguntaId,
            participanteId: 5,
            opcionId: 2,
          },
        ],
        skipDuplicates: true,
      });

      expect(cacheService.commitVotes).toHaveBeenCalledWith(procKey);

      expect(result).toEqual({ count: 1 });
    });

    it('debe lanzar error si prepareVotesForPersist falla', async () => {
      mockCacheService.prepareVotesForPersist.mockRejectedValue(
        new Error('Redis is down'),
      );

      await expect(
        service.persistirVotos(1, 10),
      ).rejects.toThrow('Redis is down');

      expect(prismaService.votosPublico.createMany)
        .not.toHaveBeenCalled();
    });

    it('debe persistir múltiples votos correctamente', async () => {
      const rondaId = 1;
      const preguntaId = 10;

      // Simulación de 100 votos concurrentes
      const mockVotes = Array.from({ length: 100 }, (_, i) => ({
        participanteId: i + 1,
        opcionId: (i % 4) + 1,
      }));

      const procKey = 'votes:1:10:processing:massive';

      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: procKey,
        votes: mockVotes,
      });

      mockPrismaService.votosPublico.createMany.mockResolvedValue({
        count: 100,
      });

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(cacheService.prepareVotesForPersist).toHaveBeenCalledWith(
        rondaId,
        preguntaId,
      );

      expect(prismaService.votosPublico.createMany).toHaveBeenCalledWith({
        data: mockVotes.map((v) => ({
          rondaId,
          preguntaId,
          participanteId: v.participanteId,
          opcionId: v.opcionId,
        })),
        skipDuplicates: true,
      });

      expect(cacheService.commitVotes).toHaveBeenCalledWith(procKey);

      expect(result).toEqual({ count: 100 });
    });

    it('debe lanzar error si commitVotes falla después del insert', async () => {
      const rondaId = 1;
      const preguntaId = 10;

      const mockVotes = [{ participanteId: 5, opcionId: 2 }];

      const procKey = 'votes:1:10:processing:commit-fail';

      mockCacheService.prepareVotesForPersist.mockResolvedValue({
        processingKey: procKey,
        votes: mockVotes,
      });

      // PostgreSQL guarda correctamente
      mockPrismaService.votosPublico.createMany.mockResolvedValue({
        count: 1,
      });

      // Redis falla al limpiar la clave temporal
      mockCacheService.commitVotes.mockRejectedValue(
        new Error('Redis commit failed'),
      );

      await expect(
        service.persistirVotos(rondaId, preguntaId),
      ).rejects.toThrow('Redis commit failed');

      expect(prismaService.votosPublico.createMany).toHaveBeenCalled();

      expect(cacheService.commitVotes).toHaveBeenCalledWith(procKey);

      // No debe hacer rollback porque PostgreSQL ya persistió correctamente
      expect(cacheService.rollbackVotes).not.toHaveBeenCalled();
    });
    
  });
});
