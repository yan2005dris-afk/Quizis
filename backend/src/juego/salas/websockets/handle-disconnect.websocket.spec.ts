import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HandleDisconnectWebsocket } from './handle-disconnect.websocket';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';
import { GameEvents } from '../../../infrastructure/common/events/game-events.types';

describe('HandleDisconnectWebsocket', () => {
  let websocket: HandleDisconnectWebsocket;

  const mockParticipantsCache = {
    removeParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const baseInfo = {
    tokenCompartido: 'token-abc',
    nickname: 'alice',
    socketId: 'socket-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleDisconnectWebsocket,
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    websocket = module.get<HandleDisconnectWebsocket>(HandleDisconnectWebsocket);
    jest.clearAllMocks();
  });

  it('remueve participante online y emite evento PARTICIPANTE_DESCONECTADO', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);

    const result = await websocket.execute(baseInfo);

    expect(mockParticipantsCache.removeParticipantOnline).toHaveBeenCalledWith(
      'token-abc',
      'alice',
    );

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      GameEvents.SALA.PARTICIPANTE_DESCONECTADO,
      {
        tokenCompartido: 'token-abc',
        nickname: 'alice',
        socketId: 'socket-1',
      },
    );

    expect(result).toEqual({
      tokenCompartido: 'token-abc',
      participants: ['bob'],
    });
  });
});
