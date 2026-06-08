import { Test, TestingModule } from '@nestjs/testing';
import { JuegoGateway } from './juego.gateway';
import { SalasService } from '../../juego/salas/salas.service';
import { VotosService } from '../../juego/votos/votos.service';
import { ChatService } from '../../juego/chat/chat.service';
import { ComodinesService } from '../../juego/comodines/comodines.service';
import { HandleJoinRoomWebsocket } from '../../juego/salas/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from '../../juego/salas/websockets/handle-disconnect.websocket';
import { ToggleRoomEnabledWebsocket } from '../../juego/salas/websockets/toggle-room-enabled.websocket';
import { ProcessAudienceVoteWebsocket } from '../../juego/votos/websockets/process-audience-vote.websocket';
import { SubmitAnswerWebsocket } from '../../juego/votos/websockets/submit-answer.websocket';
import { ReleaseQuestionWebsocket } from '../../juego/rondas/websockets/release-question.websocket';
import { ActivateCallJokerWebsocket } from '../../juego/comodines/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../juego/comodines/websockets/send-hint.websocket';

describe('JuegoGateway — handleComodinBloqueado', () => {
  let gateway: JuegoGateway;
  let salasService: jest.Mocked<
    Pick<SalasService, 'addBlockedComodin'>
  >;

  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockServer = { to: mockTo };

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
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    salasService = module.get(SalasService) as any;

    // Inyectar el server mock
    (gateway as any).server = mockServer;

    jest.clearAllMocks();
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  it('comodín no-PUBLICO → solo emite comodin_bloqueado', async () => {
    const payload = {
      tokenCompartido: 'token-123',
      userId: 'user-1',
      tipoComodin: 'IA',
    };

    await gateway.handleComodinBloqueado(payload);

    expect(salasService.addBlockedComodin).toHaveBeenCalledWith(
      'token-123',
      'IA',
    );
    expect(mockTo).toHaveBeenCalledWith('token-123');
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('comodin_bloqueado', payload);
  });

  it('comodín PUBLICO → emite comodin_bloqueado y voto_recibido con zeros', async () => {
    const payload = {
      tokenCompartido: 'token-123',
      userId: 'user-1',
      tipoComodin: 'PUBLICO',
    };

    await gateway.handleComodinBloqueado(payload);

    expect(salasService.addBlockedComodin).toHaveBeenCalledWith(
      'token-123',
      'PUBLICO',
    );
    expect(mockEmit).toHaveBeenCalledTimes(2);
    expect(mockEmit).toHaveBeenCalledWith('comodin_bloqueado', payload);
    expect(mockEmit).toHaveBeenCalledWith('voto_recibido', {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      total: 0,
    });
  });
});
