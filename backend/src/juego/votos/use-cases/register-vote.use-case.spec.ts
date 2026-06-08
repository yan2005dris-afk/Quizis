import { Test, TestingModule } from '@nestjs/testing';
import { RegisterVoteUseCase } from './register-vote.use-case';
import { VotesCacheService } from '../cache/votes-cache.service';

describe('RegisterVoteUseCase', () => {
  let useCase: RegisterVoteUseCase;
  let cache: VotesCacheService;

  const mockCache = {
    setVote: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterVoteUseCase,
        { provide: VotesCacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<RegisterVoteUseCase>(RegisterVoteUseCase);
    cache = module.get<VotesCacheService>(VotesCacheService);
  });

  it('should call cacheService.setVote', async () => {
    await useCase.execute(1, 2, 3, 4);
    expect(cache.setVote).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(cache.setVote).toHaveBeenCalledTimes(1);
  });
});
