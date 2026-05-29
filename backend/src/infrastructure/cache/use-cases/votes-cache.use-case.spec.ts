import { Test, TestingModule } from '@nestjs/testing';
import { VotesCacheUseCase } from './votes-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('VotesCacheUseCase', () => {
  let useCase: VotesCacheUseCase;

  const mockTx = {
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 'OK']]),
  };

  const mockClient = {
    hset: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
    del: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue(mockTx),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisService.getClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotesCacheUseCase,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    useCase = module.get<VotesCacheUseCase>(VotesCacheUseCase);

    await useCase.onModuleInit();
  });

  afterEach(async () => {
    await useCase?.onModuleDestroy();
  });

  describe('VotesCacheUseCase', () => {
    it('debe guardar un voto en Redis', async () => {
      await useCase.setVote(1, 2, 10, 3);

      expect(mockClient.hset).toHaveBeenCalledWith('votes:1:2', '10', '3');

      expect(mockClient.expire).toHaveBeenCalledWith('votes:1:2', 3600);
    });

    it('debe usar memoria si Redis falla', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.setVote(1, 2, 10, 3);

      const result = await useCase.getVotes(1, 2);

      expect(result).toEqual([
        {
          participanteId: 10,
          opcionId: 3,
        },
      ]);
    });

    it('debe obtener votos desde Redis', async () => {
      mockClient.hgetall.mockResolvedValue({
        '10': '3',
        '11': '4',
      });

      const result = await useCase.getVotes(1, 2);

      expect(result).toEqual(
        expect.arrayContaining([
          {
            participanteId: 10,
            opcionId: 3,
          },
          {
            participanteId: 11,
            opcionId: 4,
          },
        ]),
      );
    });

    it('debe eliminar votos', async () => {
      await useCase.clearVotes(1, 2);

      expect(mockClient.del).toHaveBeenCalledWith('votes:1:2');
    });

    it('debe restaurar votos al key original en memoria durante rollback', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const processingKey = 'votes:1:10:processing:12345';
      (useCase as any).memoryVotes.set(processingKey, {
        votes: new Map([[100, 5]]),
        expiresAt: Date.now() + 3600000,
      });

      await useCase.rollbackVotes(processingKey, 1, 10);

      const originalVotes = await useCase.getVotes(1, 10);
      expect(originalVotes).toContainEqual({
        participanteId: 100,
        opcionId: 5,
      });
      expect((useCase as any).memoryVotes.has(processingKey)).toBe(false);
    });
  });
});
