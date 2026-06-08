import { Test, TestingModule } from '@nestjs/testing';
import {
  ProcessAudienceVoteWebsocket,
  VotePayload,
} from './process-audience-vote.websocket';
import { ValidateVoteUniquenessWebsocket } from './validate-vote-uniqueness.websocket';
import { VotosService } from '../votos.service';
import { RoomStateCacheService } from '../../salas/cache/room-state-cache.service';
import { VotesCacheService } from '../cache/votes-cache.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ProcessAudienceVoteWebsocket', () => {
  let websocket: ProcessAudienceVoteWebsocket;
  let validateUniqueness: ValidateVoteUniquenessWebsocket;
  let votosService: VotosService;
  let roomStateCache: RoomStateCacheService;
  let votesCache: VotesCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessAudienceVoteWebsocket,
        {
          provide: ValidateVoteUniquenessWebsocket,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: VotosService,
          useValue: {
            registrarVoto: jest.fn(),
            obtenerVotosCache: jest.fn(),
          },
        },
        {
          provide: RoomStateCacheService,
          useValue: {
            getActiveQuestion: jest.fn(),
          },
        },
        {
          provide: VotesCacheService,
          useValue: {
            getDistribution: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    websocket = module.get<ProcessAudienceVoteWebsocket>(
      ProcessAudienceVoteWebsocket,
    );
    validateUniqueness = module.get<ValidateVoteUniquenessWebsocket>(
      ValidateVoteUniquenessWebsocket,
    );
    votosService = module.get<VotosService>(VotosService);
    roomStateCache = module.get<RoomStateCacheService>(RoomStateCacheService);
    votesCache = module.get<VotesCacheService>(VotesCacheService);
  });

  const mockPayload: VotePayload = {
    salaId: 1,
    rondaId: 1,
    tokenCompartido: 'abc-123',
    preguntaId: 10,
    participanteId: 100,
    opcionId: 5,
  };

  it('debería procesar el voto exitosamente si es permitido', async () => {
    jest.spyOn(validateUniqueness, 'execute').mockResolvedValue(true);
    jest.spyOn(votosService, 'registrarVoto').mockResolvedValue(undefined);
    jest
      .spyOn(votesCache, 'getDistribution')
      .mockResolvedValue(new Map([[5, 1]]));
    jest.spyOn(roomStateCache, 'getActiveQuestion').mockResolvedValue({
      opciones: [{ opcionId: 5, letra: 'A' }],
    } as any);

    const result = await websocket.execute(mockPayload);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Voto registrado correctamente.');
    expect(votosService.registrarVoto).toHaveBeenCalledWith(1, 10, 100, 5);
  });

  it('debería rechazar el voto si es duplicado', async () => {
    jest.spyOn(validateUniqueness, 'execute').mockResolvedValue(false);

    const result = await websocket.execute(mockPayload);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Acción bloqueada');
    expect(votosService.registrarVoto).not.toHaveBeenCalled();
  });
});
