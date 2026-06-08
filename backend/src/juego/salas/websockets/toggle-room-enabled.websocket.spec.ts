import { Test, TestingModule } from '@nestjs/testing';
import { ToggleRoomEnabledWebsocket } from './toggle-room-enabled.websocket';
import { RoomStateCacheService } from '../../salas/cache/room-state-cache.service';

describe('ToggleRoomEnabledWebsocket', () => {
  let websocket: ToggleRoomEnabledWebsocket;

  const mockCacheService = {
    setRoomEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleRoomEnabledWebsocket,
        { provide: RoomStateCacheService, useValue: mockCacheService },
      ],
    }).compile();

    websocket = module.get<ToggleRoomEnabledWebsocket>(ToggleRoomEnabledWebsocket);
    jest.clearAllMocks();
    mockCacheService.setRoomEnabled.mockResolvedValue(undefined);
  });

  it('toggle enabled true → setRoomEnabled(token, true)', async () => {
    await websocket.execute('T1', true);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith(
      'T1',
      true,
    );
  });

  it('toggle enabled false → setRoomEnabled(token, false)', async () => {
    await websocket.execute('T1', false);

    expect(mockCacheService.setRoomEnabled).toHaveBeenCalledWith(
      'T1',
      false,
    );
  });

  it('retorna { success: true, enabled, message }', async () => {
    const resultTrue = await websocket.execute('T1', true);
    expect(resultTrue.success).toBe(true);
    expect(resultTrue.enabled).toBe(true);
    expect(typeof resultTrue.message).toBe('string');

    const resultFalse = await websocket.execute('T1', false);
    expect(resultFalse.success).toBe(true);
    expect(resultFalse.enabled).toBe(false);
  });
});
