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
