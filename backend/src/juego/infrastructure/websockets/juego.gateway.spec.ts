import { Test, TestingModule } from '@nestjs/testing';
import { JuegoGateway } from './juego.gateway';
import { SalasService } from '../../salas/application/salas.service';
import { VotosService } from '../../votos/application/votos.service';
import { ChatService } from '../../chat/application/chat.service';
import { ComodinesService } from '../../comodines/application/comodines.service';
import { HandleJoinRoomWebsocket } from '../../salas/infrastructure/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from '../../salas/infrastructure/websockets/handle-disconnect.websocket';
import { ToggleRoomEnabledWebsocket } from '../../salas/infrastructure/websockets/toggle-room-enabled.websocket';
import { ProcessAudienceVoteWebsocket } from '../../votos/infrastructure/websockets/process-audience-vote.websocket';
import { SubmitAnswerWebsocket } from '../../votos/infrastructure/websockets/submit-answer.websocket';
import { ReleaseQuestionWebsocket } from '../../rondas/infrastructure/websockets/release-question.websocket';
import { ActivateCallJokerWebsocket } from '../../comodines/infrastructure/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../comodines/infrastructure/websockets/send-hint.websocket';
import { RoomBroadcasterService } from './room-broadcaster.service';
import { SocketMapService } from './socket-map.service';
import { DistributedTimerService } from './distributed-timer.service';

describe('JuegoGateway — handleComodinBloqueado', () => {
  let gateway: JuegoGateway;
  let salasService: jest.Mocked<Pick<SalasService, 'addBlockedComodin'>>;
  let roomBroadcaster: jest.Mocked<Pick<RoomBroadcasterService, 'broadcastToRoom'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        {
          provide: SalasService,
          useValue: { addBlockedComodin: jest.fn() },
        },
        { provide: VotosService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: ComodinesService, useValue: {} },
        { provide: HandleJoinRoomWebsocket, useValue: {} },
        { provide: HandleDisconnectWebsocket, useValue: {} },
        { provide: ToggleRoomEnabledWebsocket, useValue: {} },
        { provide: ProcessAudienceVoteWebsocket, useValue: {} },
        { provide: SubmitAnswerWebsocket, useValue: {} },
        { provide: ReleaseQuestionWebsocket, useValue: {} },
        { provide: ActivateCallJokerWebsocket, useValue: {} },
        { provide: SendHintWebsocket, useValue: {} },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), findSocketId: jest.fn(), getRoomSize: jest.fn() },
        },
        {
          provide: DistributedTimerService,
          useValue: { iniciarTimer: jest.fn(), detenerTimer: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    salasService = module.get(SalasService) as any;
    roomBroadcaster = module.get(RoomBroadcasterService) as any;

    jest.clearAllMocks();
  });

  it('comodín no-PUBLICO → solo emite comodin_bloqueado', async () => {
    const payload = {
      tokenCompartido: 'token-123',
      userId: 'user-1',
      tipoComodin: 'IA',
    };

    await gateway.handleComodinBloqueado(payload);

    expect(salasService.addBlockedComodin).toHaveBeenCalledWith('token-123', 'IA');
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'token-123',
      'comodin_bloqueado',
      payload,
    );
  });

  it('comodín PUBLICO → emite comodin_bloqueado y voto_recibido con zeros', async () => {
    const payload = {
      tokenCompartido: 'token-123',
      userId: 'user-1',
      tipoComodin: 'PUBLICO',
    };

    await gateway.handleComodinBloqueado(payload);

    expect(salasService.addBlockedComodin).toHaveBeenCalledWith('token-123', 'PUBLICO');
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledTimes(2);
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'token-123',
      'comodin_bloqueado',
      payload,
    );
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'token-123',
      'voto_recibido',
      { A: 0, B: 0, C: 0, D: 0, total: 0 },
    );
  });
});

describe('JuegoGateway — handleDisconnect', () => {
  let gateway: JuegoGateway;
  let socketMapService: jest.Mocked<Pick<SocketMapService, 'get' | 'delete' | 'getRoomSize' | 'set' | 'findSocketId'>>;
  let roomBroadcaster: jest.Mocked<Pick<RoomBroadcasterService, 'broadcastToRoom' | 'setServer'>>;
  let handleDisconnectWebsocket: jest.Mocked<Pick<HandleDisconnectWebsocket, 'execute'>>;
  let salasService: jest.Mocked<Pick<SalasService, 'getParticipantsWithRoles' | 'addBlockedComodin'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        {
          provide: SalasService,
          useValue: { getParticipantsWithRoles: jest.fn(), addBlockedComodin: jest.fn() },
        },
        { provide: VotosService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: ComodinesService, useValue: {} },
        { provide: HandleJoinRoomWebsocket, useValue: {} },
        {
          provide: HandleDisconnectWebsocket,
          useValue: { execute: jest.fn() },
        },
        { provide: ToggleRoomEnabledWebsocket, useValue: {} },
        { provide: ProcessAudienceVoteWebsocket, useValue: {} },
        { provide: SubmitAnswerWebsocket, useValue: {} },
        { provide: ReleaseQuestionWebsocket, useValue: {} },
        { provide: ActivateCallJokerWebsocket, useValue: {} },
        { provide: SendHintWebsocket, useValue: {} },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), findSocketId: jest.fn(), getRoomSize: jest.fn() },
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
    const participantesDb = [{ id: '1', nombre: 'Alice', puntaje: 0, rol: 'estudiante' }];

    (socketMapService.get as jest.Mock).mockResolvedValue(socketInfo);
    (handleDisconnectWebsocket.execute as jest.Mock).mockResolvedValue({
      tokenCompartido: 'token-abc',
      participants,
    });
    (socketMapService.getRoomSize as jest.Mock).mockResolvedValue(1);
    (salasService.getParticipantsWithRoles as jest.Mock).mockResolvedValue(participantesDb);

    const fakeClient = { id: 'socket-1' } as any;
    await gateway.handleDisconnect(fakeClient);

    expect(socketMapService.delete).toHaveBeenCalledWith('socket-1');
    expect(roomBroadcaster.broadcastToRoom).toHaveBeenCalledWith('token-abc', 'participantes', participantesDb);
  });
});

describe('JuegoGateway — handleJoinRoomMessage', () => {
  let gateway: JuegoGateway;
  let socketMapService: jest.Mocked<Pick<SocketMapService, 'get' | 'delete' | 'getRoomSize' | 'set' | 'findSocketId'>>;
  let handleJoinRoom: jest.Mocked<Pick<HandleJoinRoomWebsocket, 'execute'>>;
  let salasService: jest.Mocked<Pick<SalasService, 'getParticipantsWithRoles' | 'addBlockedComodin' | 'obtenerPorId' | 'updateParticipantRole' | 'getBlockedComodines'>>;
  let chatService: jest.Mocked<Pick<ChatService, 'getChatMessages'>>;
  let roomBroadcaster: jest.Mocked<Pick<RoomBroadcasterService, 'broadcastToRoom' | 'setServer'>>;

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
        { provide: ToggleRoomEnabledWebsocket, useValue: {} },
        { provide: ProcessAudienceVoteWebsocket, useValue: {} },
        { provide: SubmitAnswerWebsocket, useValue: {} },
        { provide: ReleaseQuestionWebsocket, useValue: {} },
        { provide: ActivateCallJokerWebsocket, useValue: {} },
        { provide: SendHintWebsocket, useValue: {} },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), findSocketId: jest.fn(), getRoomSize: jest.fn() },
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
    roomBroadcaster = module.get(RoomBroadcasterService) as any;

    jest.clearAllMocks();
  });

  it('calls socketMapService.set with correct socketId, tokenCompartido and nickname', async () => {
    const joinResult = {
      tokenCompartido: 'token-xyz',
      nickname: 'Bob',
      participants: ['Bob'],
    };
    const participantesDb = [{ id: '2', nombre: 'Bob', puntaje: 0, rol: 'profesor' }];

    (handleJoinRoom.execute as jest.Mock).mockResolvedValue(joinResult);
    (salasService.getParticipantsWithRoles as jest.Mock).mockResolvedValue(participantesDb);
    (salasService.getBlockedComodines as jest.Mock).mockResolvedValue([]);
    (chatService.getChatMessages as jest.Mock).mockResolvedValue([]);

    const fakeClient = { id: 'socket-2', join: jest.fn(), emit: jest.fn() } as any;
    await gateway.handleJoinRoomMessage(fakeClient, { tokenCompartido: 'token-xyz', nombre: 'Bob' });

    expect(socketMapService.set).toHaveBeenCalledWith('socket-2', {
      tokenCompartido: 'token-xyz',
      nickname: 'Bob',
    });
  });
});

describe('JuegoGateway — pregunta_liberada (iniciarTimer)', () => {
  let gateway: JuegoGateway;
  let distributedTimerService: jest.Mocked<Pick<DistributedTimerService, 'iniciarTimer' | 'detenerTimer'>>;
  let releaseQuestionWebsocket: jest.Mocked<Pick<ReleaseQuestionWebsocket, 'execute'>>;
  let votosService: jest.Mocked<Pick<VotosService, 'initConsensusRequired'>>;
  let salasService: jest.Mocked<Pick<SalasService, 'getTiempoLimite' | 'addBlockedComodin'>>;
  let roomBroadcaster: jest.Mocked<Pick<RoomBroadcasterService, 'broadcastToRoom' | 'setServer'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        {
          provide: SalasService,
          useValue: { getTiempoLimite: jest.fn(), addBlockedComodin: jest.fn() },
        },
        {
          provide: VotosService,
          useValue: { initConsensusRequired: jest.fn() },
        },
        { provide: ChatService, useValue: {} },
        { provide: ComodinesService, useValue: {} },
        { provide: HandleJoinRoomWebsocket, useValue: {} },
        { provide: HandleDisconnectWebsocket, useValue: {} },
        { provide: ToggleRoomEnabledWebsocket, useValue: {} },
        { provide: ProcessAudienceVoteWebsocket, useValue: {} },
        { provide: SubmitAnswerWebsocket, useValue: {} },
        {
          provide: ReleaseQuestionWebsocket,
          useValue: { execute: jest.fn() },
        },
        { provide: ActivateCallJokerWebsocket, useValue: {} },
        { provide: SendHintWebsocket, useValue: {} },
        {
          provide: RoomBroadcasterService,
          useValue: { broadcastToRoom: jest.fn(), setServer: jest.fn() },
        },
        {
          provide: SocketMapService,
          useValue: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), findSocketId: jest.fn(), getRoomSize: jest.fn() },
        },
        {
          provide: DistributedTimerService,
          useValue: { iniciarTimer: jest.fn(), detenerTimer: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    distributedTimerService = module.get(DistributedTimerService) as any;
    releaseQuestionWebsocket = module.get(ReleaseQuestionWebsocket) as any;
    votosService = module.get(VotosService) as any;
    salasService = module.get(SalasService) as any;
    roomBroadcaster = module.get(RoomBroadcasterService) as any;

    jest.clearAllMocks();
  });

  it('calls distributedTimerService.iniciarTimer when pregunta_liberada is handled', async () => {
    (releaseQuestionWebsocket.execute as jest.Mock).mockResolvedValue(undefined);
    (votosService.initConsensusRequired as jest.Mock).mockResolvedValue(undefined);
    (salasService.getTiempoLimite as jest.Mock).mockResolvedValue(30);
    (distributedTimerService.iniciarTimer as jest.Mock).mockResolvedValue(undefined);

    const payload = { tokenCompartido: 'token-timer', pregunta: { preguntaId: 5 } };
    await gateway.handlePreguntaLiberada(payload);

    expect(distributedTimerService.iniciarTimer).toHaveBeenCalledWith(
      'token-timer',
      30,
      expect.any(Function),
      expect.any(Function),
    );
  });
});
