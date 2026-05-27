import { Test, TestingModule } from '@nestjs/testing';
import { GetVotesFromCacheUseCase } from './get-votes-from-cache.use-case';
import { VotesCacheUseCase } from '../../../infrastructure/cache/use-cases/votes-cache.use-case';

describe('GetVotesFromCacheUseCase', () => {
  let useCase: GetVotesFromCacheUseCase;
  let cache: VotesCacheUseCase;

  const mockCache = {
    getVotes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVotesFromCacheUseCase,
        { provide: VotesCacheUseCase, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<GetVotesFromCacheUseCase>(GetVotesFromCacheUseCase);
    cache = module.get<VotesCacheUseCase>(VotesCacheUseCase);
  });

  it('should call cacheService.getVotes', async () => {
    mockCache.getVotes.mockResolvedValue([]);
    await useCase.execute(1, 2);
    expect(cache.getVotes).toHaveBeenCalledWith(1, 2);

    expect(cache.getVotes).toHaveBeenCalledTimes(1);
  });
});
