import { Test, TestingModule } from '@nestjs/testing';
import { HandleDisconnectUseCase } from './handle-disconnect.use-case';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

describe('HandleDisconnectUseCase', () => {
  let useCase: HandleDisconnectUseCase;
  let cache: ParticipantsCacheUseCase;

  const mockCache = {
    removeParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleDisconnectUseCase,
        { provide: ParticipantsCacheUseCase, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<HandleDisconnectUseCase>(HandleDisconnectUseCase);
    cache = module.get<ParticipantsCacheUseCase>(ParticipantsCacheUseCase);
  });

  it('should remove participant from online', async () => {
    const info = {
      tokenCompartido: 'T1',
      nickname: 'User1',
      socketId: 'S1',
    };

    mockCache.getOnlineParticipants.mockResolvedValue([]);
    await useCase.execute(info);

    expect(cache.removeParticipantOnline).toHaveBeenCalledWith('T1', 'User1');
  });
});
