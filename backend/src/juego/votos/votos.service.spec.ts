import { Test } from '@nestjs/testing';
import { VotosService } from './votos.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

describe('VotosService', () => {
  let service: VotosService;
  let cacheService: CacheService;
  let prismaService: PrismaService;

  const mockCacheService = {
    setVote: jest.fn(),
    getVotes: jest.fn(),
    popVotes: jest.fn(),
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

      await service.registrarVoto(rondaId, preguntaId, participanteId, opcionId);

      expect(cacheService.setVote).toHaveBeenCalledWith(rondaId, preguntaId, participanteId, opcionId);
      expect(prismaService.votosPublico.createMany).not.toHaveBeenCalled();
    });
  });

  describe('obtenerVotosCache', () => {
    it('debe retornar la lista de votos guardados en caché', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const expectedVotes = [{ participanteId: 5, opcionId: 2 }];
      mockCacheService.getVotes.mockResolvedValue(expectedVotes);

      const result = await service.obtenerVotosCache(rondaId, preguntaId);

      expect(cacheService.getVotes).toHaveBeenCalledWith(rondaId, preguntaId);
      expect(result).toEqual(expectedVotes);
    });
  });

  describe('persistirVotos', () => {
    it('debe retornar count=0 y no invocar Prisma si no hay votos en el caché', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      mockCacheService.popVotes.mockResolvedValue([]);

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(cacheService.popVotes).toHaveBeenCalledWith(rondaId, preguntaId);
      expect(prismaService.votosPublico.createMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0 });
    });

    it('debe realizar un bulk insert de los votos en PostgreSQL e indicar la cantidad guardada', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const mockVotes = [
        { participanteId: 5, opcionId: 2 },
        { participanteId: 6, opcionId: 3 },
      ];
      mockCacheService.popVotes.mockResolvedValue(mockVotes);
      mockPrismaService.votosPublico.createMany.mockResolvedValue({ count: 2 });

      const result = await service.persistirVotos(rondaId, preguntaId);

      expect(cacheService.popVotes).toHaveBeenCalledWith(rondaId, preguntaId);
      expect(prismaService.votosPublico.createMany).toHaveBeenCalledWith({
        data: [
          { rondaId, preguntaId, participanteId: 5, opcionId: 2 },
          { rondaId, preguntaId, participanteId: 6, opcionId: 3 },
        ],
        skipDuplicates: true,
      });
      expect(result).toEqual({ count: 2 });
    });
  });
});
