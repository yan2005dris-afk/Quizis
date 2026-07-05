import { Test, TestingModule } from '@nestjs/testing';
import { JuegoGateway } from './juego.gateway';
import { SalasService } from '../../salas/application/salas.service';
import { VotosService } from '../../votos/application/votos.service';
import { HandleTimerExpirationUseCase } from '../../rondas/application/use-cases/handle-timer-expiration.use-case';
import { ChatService } from '../../chat/application/chat.service';
import { ComodinesService } from '../../comodines/application/comodines.service';
import { HandleJoinRoomWebsocket } from '../../salas/infrastructure/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from '../../salas/infrastructure/websockets/handle-disconnect.websocket';
import { ToggleRoomEnabledUseCase } from '../../salas/application/use-cases/toggle-room-enabled.use-case';
import { ProcessAudienceVoteUseCase } from '../../votos/application/use-cases/process-audience-vote.use-case';
import { SubmitAnswerUseCase } from '../../votos/application/use-cases/submit-answer.use-case';
import { ReleaseQuestionUseCase } from '../../rondas/application/use-cases/release-question.use-case';
import { ActivateCallJokerUseCase } from '../../comodines/application/use-cases/activate-call-joker.use-case';
import { SendHintUseCase } from '../../comodines/application/use-cases/send-hint.use-case';
import { RoomBroadcasterService } from './room-broadcaster.service';
import { SocketMapService } from './socket-map.service';
import { DistributedTimerService } from './distributed-timer.service';
import { RoomStateCacheService } from '../../shared/room-state/room-state-cache.service';

describe('JuegoGateway — handleDisconnect', () => {
  let gateway: JuegoGateway;
  let socketMapService: jest.Mocked<
    Pick<
      SocketMapService,
      'get' | 'delete' | 'getRoomSize' | 'set' | 'findSocketId'
    >
  >;
  let roomBroadcaster: jest.Mocked<
    Pick<RoomBroadcasterService, 'broadcastToRoom' | 'setServer'>
  >;
  let handleDisconnectWebsocket: jest.Mocked<
    Pick<HandleDisconnectWebsocket, 'execute'>
  >;
  let salasService: jest.Mocked<
    Pick<SalasService, 'getParticipantsWithRoles' | 'addBlockedComodin'>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        {
          provide: SalasService,
          useValue: {
            getParticipantsWithRoles: jest.fn(),
            addBlockedComodin: jest.fn(),
          },
        },
        {
          provide: HandleTimerExpirationUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: VotosService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: ComodinesService, useValue: {} },
        { provide: HandleJoinRoomWebsocket, useValue: {} },
        {
          provide: HandleDisconnectWebsocket,
          useValue: { execute: jest.fn() },
        },
        { provide: ToggleRoomEnabledUseCase, useValue: {} },
        { provide: ProcessAudienceVoteUseCase, useValue: {} },
        { provide: SubmitAnswerUseCase, useValue: {} },
        { provide: ReleaseQuestionUseCase, useValue: {} },
        { provide: ActivateCallJokerUseCase, useValue: {} },
        { provide: SendHintUseCase, useValue: {} },
        { provide: RoomStateCacheService, useValue: { getActiveQuestion: jest.fn() } },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            findSocketId: jest.fn(),
            getRoomSize: jest.fn(),
          },
        },
        {
          provide: DistributedTimerService,
          useValue: { iniciarTimer: jest.fn(), detenerTimer: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    socketMapService = module.get(SocketMapService) as any;
    roomBroadcaster = module.get(RoomBroadcasterService) as any;
    handleDisconnectWebsocket = module.get(HandleDisconnectWebsocket) as any;
    salasService = module.get(SalasService) as any;

    jest.clearAllMocks();
  });

  it('calls socketMapService.delete and broadcastToRoom with participantes when info exists', async () => {
    const socketInfo = { tokenCompartido: 'token-abc', nickname: 'Alice' };
    const participants = ['Alice'];
    const participantesDb = [
      { id: '1', nombre: 'Alice', puntaje: 0, rol: 'estudiante' },
    ];

    (socketMapService.get as jest.Mock).mockResolvedValue(socketInfo);
    (handleDisconnectWebsocket.execute as jest.Mock).mockResolvedValue({
      tokenCompartido: 'token-abc',
      participants,
    });
    (socketMapService.getRoomSize as jest.Mock).mockResolvedValue(1);
    (salasService.getParticipantsWithRoles as jest.Mock).mockResolvedValue(
      participantesDb,
    );

    const fakeClient = { id: 'socket-1' } as any;
    await gateway.handleDisconnect(fakeClient);

    expect(socketMapService.delete).toHaveBeenCalledWith('socket-1');
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'token-abc',
      'participantes',
      participantesDb,
    );
  });
});

describe('JuegoGateway — handleJoinRoomMessage', () => {
  let gateway: JuegoGateway;
  let socketMapService: jest.Mocked<
    Pick<
      SocketMapService,
      'get' | 'delete' | 'getRoomSize' | 'set' | 'findSocketId'
    >
  >;
  let handleJoinRoom: jest.Mocked<Pick<HandleJoinRoomWebsocket, 'execute'>>;
  let salasService: jest.Mocked<
    Pick<
      SalasService,
      | 'getParticipantsWithRoles'
      | 'addBlockedComodin'
      | 'obtenerPorId'
      | 'updateParticipantRole'
      | 'getBlockedComodines'
    >
  >;
  let chatService: jest.Mocked<Pick<ChatService, 'getChatMessages'>>;


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        {
          provide: SalasService,
          useValue: {
            getParticipantsWithRoles: jest.fn(),
            addBlockedComodin: jest.fn(),
            obtenerPorId: jest.fn(),
            updateParticipantRole: jest.fn(),
            getBlockedComodines: jest.fn(),
          },
        },
        {
          provide: HandleTimerExpirationUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: VotosService, useValue: {} },
        {
          provide: ChatService,
          useValue: { getChatMessages: jest.fn() },
        },
        { provide: ComodinesService, useValue: {} },
        {
          provide: HandleJoinRoomWebsocket,
          useValue: { execute: jest.fn() },
        },
        { provide: HandleDisconnectWebsocket, useValue: {} },
        { provide: ToggleRoomEnabledUseCase, useValue: {} },
        { provide: ProcessAudienceVoteUseCase, useValue: {} },
        { provide: SubmitAnswerUseCase, useValue: {} },
        { provide: ReleaseQuestionUseCase, useValue: {} },
        { provide: ActivateCallJokerUseCase, useValue: {} },
        { provide: SendHintUseCase, useValue: {} },
        { provide: RoomStateCacheService, useValue: { getActiveQuestion: jest.fn() } },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            findSocketId: jest.fn(),
            getRoomSize: jest.fn(),
          },
        },
        {
          provide: DistributedTimerService,
          useValue: { iniciarTimer: jest.fn(), detenerTimer: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    socketMapService = module.get(SocketMapService) as any;
    handleJoinRoom = module.get(HandleJoinRoomWebsocket) as any;
    salasService = module.get(SalasService) as any;
    chatService = module.get(ChatService) as any;

    jest.clearAllMocks();
  });

  it('calls socketMapService.set with correct socketId, tokenCompartido and nickname', async () => {
    const joinResult = {
      tokenCompartido: 'token-xyz',
      nickname: 'Bob',
      participants: ['Bob'],
    };
    const participantesDb = [
      { id: '2', nombre: 'Bob', puntaje: 0, rol: 'profesor' },
    ];

    (handleJoinRoom.execute as jest.Mock).mockResolvedValue(joinResult);
    (salasService.getParticipantsWithRoles as jest.Mock).mockResolvedValue(
      participantesDb,
    );
    (salasService.getBlockedComodines as jest.Mock).mockResolvedValue([]);
    (chatService.getChatMessages as jest.Mock).mockResolvedValue([]);

    const fakeClient = {
      id: 'socket-2',
      join: jest.fn(),
      emit: jest.fn(),
    } as any;
    await gateway.handleJoinRoomMessage(fakeClient, {
      tokenCompartido: 'token-xyz',
      nombre: 'Bob',
    });

    expect(socketMapService.set).toHaveBeenCalledWith('socket-2', {
      tokenCompartido: 'token-xyz',
      nickname: 'Bob',
    });
  });
});

// ─── sdd/quizis-init-feedback: handleSalaIniciada broadcasts info_ronda ──
describe('JuegoGateway — handleSalaIniciada (info_ronda broadcast)', () => {
  let gateway: JuegoGateway;
  let roomBroadcaster: jest.Mocked<
    Pick<RoomBroadcasterService, 'broadcastToRoom' | 'setServer'>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        { provide: SalasService, useValue: {} },
        { provide: VotosService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: ComodinesService, useValue: {} },
        { provide: HandleJoinRoomWebsocket, useValue: {} },
        { provide: HandleDisconnectWebsocket, useValue: {} },
        { provide: ProcessAudienceVoteUseCase, useValue: {} },
        { provide: SubmitAnswerUseCase, useValue: {} },
        { provide: ReleaseQuestionUseCase, useValue: {} },
        { provide: ActivateCallJokerUseCase, useValue: {} },
        { provide: SendHintUseCase, useValue: {} },
        { provide: RoomStateCacheService, useValue: { getActiveQuestion: jest.fn() } },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            findSocketId: jest.fn(),
            getRoomSize: jest.fn(),
          },
        },
        {
          provide: DistributedTimerService,
          useValue: { iniciarTimer: jest.fn(), detenerTimer: jest.fn() },
        },
        {
          provide: HandleTimerExpirationUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    roomBroadcaster = module.get(RoomBroadcasterService) as any;

    jest.clearAllMocks();
  });

  it('broadcasts info_ronda to the room when sala.iniciada fires', () => {
    const infoRonda = { ronda: 1, totalRondas: 5, premio: '$1000' };
    gateway.handleSalaIniciada({
      tokenCompartido: 'T-INIT',
      infoRonda,
    });

    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'T-INIT',
      'info_ronda',
      infoRonda,
    );
  });
});
