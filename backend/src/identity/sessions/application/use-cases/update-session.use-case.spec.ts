import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateSessionUseCase } from './update-session.use-case';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('UpdateSessionUseCase', () => {
  let useCase: UpdateSessionUseCase;
  let sessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSessionUseCase,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<UpdateSessionUseCase>(UpdateSessionUseCase);
    sessionRepo = module.get(SessionRepository);
  });

  it('should update a session', async () => {
    const data = { direccionIp: '1.1.1.1' } as any;
    await useCase.execute('abc', data);

    expect(sessionRepo.update).toHaveBeenCalledWith('abc', data);
  });
});
