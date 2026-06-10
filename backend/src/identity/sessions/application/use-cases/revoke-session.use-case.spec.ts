import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RevokeSessionUseCase } from './revoke-session.use-case';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('RevokeSessionUseCase', () => {
  let useCase: RevokeSessionUseCase;
  let sessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      revoke: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokeSessionUseCase,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<RevokeSessionUseCase>(RevokeSessionUseCase);
    sessionRepo = module.get(SessionRepository);
  });

  it('should revoke a session', async () => {
    await useCase.execute('abc');

    expect(sessionRepo.revoke).toHaveBeenCalledWith('abc');
  });
});
