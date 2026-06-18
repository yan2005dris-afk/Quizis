import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import { SessionsService } from '../../../sessions/application/sessions.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let sessionsService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        {
          provide: SessionsService,
          useValue: {
            revokeSession: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
    sessionsService = module.get(SessionsService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should revoke the session', async () => {
      await useCase.execute('session-id');
      expect(sessionsService.revokeSession).toHaveBeenCalledWith('session-id');
    });
  });
});
