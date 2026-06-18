import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetSessionUseCase } from './get-session.use-case';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('GetSessionUseCase', () => {
  let useCase: GetSessionUseCase;
  let sessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findByUserAndSession: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSessionUseCase,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<GetSessionUseCase>(GetSessionUseCase);
    sessionRepo = module.get(SessionRepository);
  });

  it('should find an active session', async () => {
    sessionRepo.findByUserAndSession.mockResolvedValue({
      sesionId: 'abc',
      usuarioId: 1,
      hashRefreshToken: 'hash',
      direccionIp: null,
      usuarioAgente: null,
      revocado: false,
      expiraEn: new Date(Date.now() + 1000),
      createdAt: new Date(),
    });

    await useCase.execute(1, 'abc');

    expect(sessionRepo.findByUserAndSession).toHaveBeenCalledWith(1, 'abc');
  });
});
