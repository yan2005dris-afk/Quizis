import { Test, TestingModule } from '@nestjs/testing';
import { RegisterVoteUseCase } from './register-vote.use-case';
import { VotesCacheUseCase } from '../../../infrastructure/cache/use-cases/votes-cache.use-case';

describe('RegisterVoteUseCase', () => {
  let useCase: RegisterVoteUseCase;
  let cache: VotesCacheUseCase;

  const mockCache = {
    setVote: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterVoteUseCase,
        { provide: VotesCacheUseCase, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<RegisterVoteUseCase>(RegisterVoteUseCase);
    cache = module.get<VotesCacheUseCase>(VotesCacheUseCase);
  });

  it('should call cacheService.setVote', async () => {
    await useCase.execute(1, 2, 3, 4);
    expect(cache.setVote).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(cache.setVote).toHaveBeenCalledTimes(1);
  });
});
