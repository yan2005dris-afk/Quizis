import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListSessionsByUserUseCase } from './list-sessions-by-user.use-case';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('ListSessionsByUserUseCase', () => {
  let useCase: ListSessionsByUserUseCase;
  let sessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      listByUser: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSessionsByUserUseCase,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<ListSessionsByUserUseCase>(ListSessionsByUserUseCase);
    sessionRepo = module.get(SessionRepository);
  });

  it('should list active sessions for user', async () => {
    sessionRepo.listByUser.mockResolvedValue([]);

    await useCase.execute(1);

    expect(sessionRepo.listByUser).toHaveBeenCalledWith(1);
  });
});
