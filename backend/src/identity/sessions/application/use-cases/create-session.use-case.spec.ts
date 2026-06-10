import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateSessionUseCase } from './create-session.use-case';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
  let sessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSessionUseCase,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<CreateSessionUseCase>(CreateSessionUseCase);
    sessionRepo = module.get(SessionRepository);
  });

  it('should create a session', async () => {
    const data = {
      usuarioId: 1,
      hashRefreshToken: 'hash',
      expiraEn: new Date(),
    } as any;
    sessionRepo.create.mockResolvedValue({ sesionId: 'abc', ...data } as any);

    await useCase.execute(data);

    expect(sessionRepo.create).toHaveBeenCalledWith(data);
  });
});
