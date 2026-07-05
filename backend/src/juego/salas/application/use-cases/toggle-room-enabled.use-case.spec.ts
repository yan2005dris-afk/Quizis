import { Test, TestingModule } from '@nestjs/testing';
import { ToggleRoomEnabledUseCase } from './toggle-room-enabled.use-case';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';

describe('ToggleRoomEnabledUseCase', () => {
  let useCase: ToggleRoomEnabledUseCase;

  const mockCacheService = {
    setRoomEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleRoomEnabledUseCase,
        { provide: RoomStateCacheService, useValue: mockCacheService },
      ],
    }).compile();

    useCase = module.get<ToggleRoomEnabledUseCase>(
      ToggleRoomEnabledUseCase,
    );
    jest.clearAllMocks();
    mockCacheService.setRoomEnabled.mockResolvedValue(undefined);
  });

  it('toggle enabled true → setRoomEnabled(token, true)', async () => {
    await useCase.execute('T1', true);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith('T1', true);
  });

  it('toggle enabled false → setRoomEnabled(token, false)', async () => {
    await useCase.execute('T1', false);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith('T1', false);
  });

  it('retorna { success: true, enabled, message }', async () => {
    const resultTrue = await useCase.execute('T1', true);
    expect(resultTrue.success).toBe(true);
    expect(resultTrue.enabled).toBe(true);
    expect(typeof resultTrue.message).toBe('string');

    const resultFalse = await useCase.execute('T1', false);
    expect(resultFalse.success).toBe(true);
    expect(resultFalse.enabled).toBe(false);
  });
});
