import { Test, TestingModule } from '@nestjs/testing';
import { RegisterVoteUseCase } from './register-vote.use-case';
import { CacheService } from '../../../infrastructure/cache/cache.service';

describe('RegisterVoteUseCase', () => {
  let useCase: RegisterVoteUseCase;
  let cache: CacheService;

  const mockCache = {
    setVote: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterVoteUseCase,
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<RegisterVoteUseCase>(RegisterVoteUseCase);
    cache = module.get<CacheService>(CacheService);
  });

  it('should call cacheService.setVote', async () => {
    await useCase.execute(1, 2, 3, 4);
    expect(cache.setVote).toHaveBeenCalledWith(1, 2, 3, 4);
  });
});
