import { Test, TestingModule } from '@nestjs/testing';
import { PersistVotesUseCase } from './persist-votes.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { VotesCacheUseCase } from '../../../infrastructure/cache/use-cases/votes-cache.use-case';

describe('PersistVotesUseCase', () => {
  let useCase: PersistVotesUseCase;

  const mockPrisma = {
    votosPublico: {
      createMany: jest.fn(),
    },
  };

  const mockCache = {
    prepareVotesForPersist: jest.fn(),
    commitVotes: jest.fn(),
    rollbackVotes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistVotesUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VotesCacheUseCase, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<PersistVotesUseCase>(PersistVotesUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should persist votes successfully', async () => {
    const votes = [{ participanteId: 1, opcionId: 2 }];
    mockCache.prepareVotesForPersist.mockResolvedValue({
      processingKey: 'key',
      votes,
    });
    mockPrisma.votosPublico.createMany.mockResolvedValue({ count: 1 });

    const result = await useCase.execute(1, 1);

    expect(result.count).toBe(1);
    expect(mockPrisma.votosPublico.createMany).toHaveBeenCalled();
    expect(mockCache.commitVotes).toHaveBeenCalledWith('key');
  });

  it('should return 0 if no votes to persist', async () => {
    mockCache.prepareVotesForPersist.mockResolvedValue({
      processingKey: 'key',
      votes: [],
    });

    const result = await useCase.execute(1, 1);

    expect(result.count).toBe(0);
    expect(mockPrisma.votosPublico.createMany).not.toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    mockCache.prepareVotesForPersist.mockResolvedValue({
      processingKey: 'key',
      votes: [{ participanteId: 1 }],
    });
    mockPrisma.votosPublico.createMany.mockRejectedValue(new Error('DB Error'));

    await expect(useCase.execute(1, 1)).rejects.toThrow('DB Error');
    expect(mockCache.rollbackVotes).toHaveBeenCalledWith('key', 1, 1);
  });
});
