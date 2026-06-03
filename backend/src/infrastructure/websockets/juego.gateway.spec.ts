import { Test, TestingModule } from '@nestjs/testing';
import { JuegoGateway } from './juego.gateway';
import { WebsocketsService } from '../../juego/websockets/websockets.service';
import { SalasService } from '../../juego/salas/salas.service';
import { RoomStateCacheUseCase } from '../cache/use-cases/room-state-cache.use-case';
import { ParticipantsCacheUseCase } from '../cache/use-cases/participants-cache.use-case';
import { ChatCacheUseCase } from '../cache/use-cases/chat-cache.use-case';
import { HelperCacheUseCase } from '../cache/use-cases/helper-cache.use-case';
import { ConsensusCacheUseCase } from '../cache/use-cases/consensus-cache.use-case';
import { EvaluateConsensusUseCase } from '../../juego/websockets/use-cases/evaluate-consensus.use-case';

describe('JuegoGateway — handleComodinBloqueado', () => {
  let gateway: JuegoGateway;
  let roomStateCache: jest.Mocked<
    Pick<RoomStateCacheUseCase, 'addBlockedComodin'>
  >;

  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockServer = { to: mockTo };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegoGateway,
        { provide: WebsocketsService, useValue: {} },
        { provide: SalasService, useValue: {} },
        {
          provide: RoomStateCacheUseCase,
          useValue: { addBlockedComodin: jest.fn() },
        },
        { provide: ParticipantsCacheUseCase, useValue: {} },
        { provide: ChatCacheUseCase, useValue: {} },
        { provide: HelperCacheUseCase, useValue: {} },
        { provide: ConsensusCacheUseCase, useValue: {} },
        { provide: EvaluateConsensusUseCase, useValue: {} },
      ],
    }).compile();

    gateway = module.get<JuegoGateway>(JuegoGateway);
    roomStateCache = module.get(RoomStateCacheUseCase);

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

    expect(roomStateCache.addBlockedComodin).toHaveBeenCalledWith(
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

    expect(roomStateCache.addBlockedComodin).toHaveBeenCalledWith(
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

  it('comodín PUBLICO → voto_recibido tiene total: 0 (no división por cero en frontend)', async () => {
    const payload = {
      tokenCompartido: 'sala-abc',
      userId: 'user-2',
      tipoComodin: 'PUBLICO',
    };

    await gateway.handleComodinBloqueado(payload);

    const votoRecibidoCall = mockEmit.mock.calls.find(
      (call) => call[0] === 'voto_recibido',
    );
    expect(votoRecibidoCall).toBeDefined();
    expect(votoRecibidoCall![1].total).toBe(0);
  });
});
