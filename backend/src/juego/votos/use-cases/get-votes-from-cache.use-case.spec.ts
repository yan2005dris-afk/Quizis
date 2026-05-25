import { Test, TestingModule } from '@nestjs/testing';
import { GetVotesFromCacheUseCase } from './get-votes-from-cache.use-case';
import { CacheService } from '../../../infrastructure/cache/cache.service';

describe('GetVotesFromCacheUseCase', () => {
  let useCase: GetVotesFromCacheUseCase;
  let cache: CacheService;

  const mockCache = {
    getVotes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVotesFromCacheUseCase,
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<GetVotesFromCacheUseCase>(GetVotesFromCacheUseCase);
    cache = module.get<CacheService>(CacheService);
  });

  it('should call cacheService.getVotes', async () => {
    mockCache.getVotes.mockResolvedValue([]);
    await useCase.execute(1, 2);
    expect(cache.getVotes).toHaveBeenCalledWith(1, 2);
  });
});
