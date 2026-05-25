import { Test, TestingModule } from '@nestjs/testing';
import { HandleDisconnectUseCase } from './handle-disconnect.use-case';
import { CacheService } from '../../../infrastructure/cache/cache.service';

describe('HandleDisconnectUseCase', () => {
  let useCase: HandleDisconnectUseCase;
  let cache: CacheService;

  const mockCache = {
    removeParticipantOnline: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleDisconnectUseCase,
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<HandleDisconnectUseCase>(HandleDisconnectUseCase);
    cache = module.get<CacheService>(CacheService);
  });

  it('should remove participant from online', async () => {
    const info = {
      tokenCompartido: 'T1',
      nickname: 'User1',
      socketId: 'S1',
    };

    await useCase.execute(info);

    expect(cache.removeParticipantOnline).toHaveBeenCalledWith('T1', 'User1');
  });
});
