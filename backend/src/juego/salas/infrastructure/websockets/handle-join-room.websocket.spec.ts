import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HandleJoinRoomWebsocket } from './handle-join-room.websocket';
import { ParticipantsCacheService } from '../cache/participants-cache.service';
import { RoomStateCacheService } from '../cache/room-state-cache.service';
import { SalasService } from '../../application/salas.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

describe('HandleJoinRoomWebsocket', () => {
  let websocket: HandleJoinRoomWebsocket;

  const mockParticipantsCache = {
    addParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
  };

  const mockSalasService = {
    getParticipantsWithRoles: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleJoinRoomWebsocket,
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: RoomStateCacheService, useValue: mockRoomStateCache },
        { provide: SalasService, useValue: mockSalasService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    websocket = module.get<HandleJoinRoomWebsocket>(HandleJoinRoomWebsocket);
    jest.clearAllMocks();
  });

  it('registra participante online y emite evento PARTICIPANTE_UNIDO', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['User1']);

    const result = await websocket.execute({
      tokenCompartido: 'T1',
      nombre: 'User1',
      socketId: 'S1',
    });

    expect(result).toEqual({
      tokenCompartido: 'T1',
      nickname: 'User1',
      participants: ['User1'],
    });

    expect(mockParticipantsCache.addParticipantOnline).toHaveBeenCalledWith(
      'T1',
      'User1',
    );

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      GameEvents.SALA.PARTICIPANTE_UNIDO,
      {
        tokenCompartido: 'T1',
        nickname: 'User1',
        socketId: 'S1',
      },
    );
  });
});
