import { Test, TestingModule } from '@nestjs/testing';
import { ToggleRoomEnabledUseCase } from './toggle-room-enabled.use-case';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';

describe('ToggleRoomEnabledUseCase', () => {
  let useCase: ToggleRoomEnabledUseCase;

  const mockCacheService = {
    setRoomEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleRoomEnabledUseCase,
        { provide: RoomStateCacheUseCase, useValue: mockCacheService },
      ],
    }).compile();

    useCase = module.get<ToggleRoomEnabledUseCase>(ToggleRoomEnabledUseCase);
    jest.clearAllMocks();
    mockCacheService.setRoomEnabled.mockResolvedValue(undefined);
  });

  it('toggle enabled true → setRoomEnabled(token, true)', async () => {
    await useCase.execute('token-abc', true);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith('token-abc', true);
  });

  it('toggle enabled false → setRoomEnabled(token, false)', async () => {
    await useCase.execute('token-abc', false);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith('token-abc', false);
  });

  it('retorna { success: true, enabled, message }', async () => {
    const resultTrue = await useCase.execute('token-abc', true);
    expect(resultTrue.success).toBe(true);
    expect(resultTrue.enabled).toBe(true);
    expect(typeof resultTrue.message).toBe('string');

    const resultFalse = await useCase.execute('token-abc', false);
    expect(resultFalse.success).toBe(true);
    expect(resultFalse.enabled).toBe(false);
  });
});
