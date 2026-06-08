import { Test, TestingModule } from '@nestjs/testing';
import { ValidateVoteUniquenessWebsocket } from './validate-vote-uniqueness.websocket';
import { ConfigService } from '@nestjs/config';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';

describe('ValidateVoteUniquenessWebsocket', () => {
  let websocket: ValidateVoteUniquenessWebsocket;
  let cacheService: ParticipantsCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateVoteUniquenessWebsocket,
        {
          provide: ParticipantsCacheService,
          useValue: {
            checkAndSetDuplicate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(3600),
          },
        },
      ],
    }).compile();

    websocket = module.get<ValidateVoteUniquenessWebsocket>(
      ValidateVoteUniquenessWebsocket,
    );
    cacheService = module.get<ParticipantsCacheService>(
      ParticipantsCacheService,
    );
  });

  it('debería retornar true si el voto es nuevo (no duplicado)', async () => {
    jest.spyOn(cacheService, 'checkAndSetDuplicate').mockResolvedValue(true);

    const result = await websocket.execute(1, 10, 100);

    expect(result).toBe(true);
    expect(cacheService.checkAndSetDuplicate).toHaveBeenCalledWith(
      'votes:check:1:10',
      '100',
      3600,
    );
  });

  it('debería retornar false si el voto ya existe (duplicado)', async () => {
    jest.spyOn(cacheService, 'checkAndSetDuplicate').mockResolvedValue(false);

    const result = await websocket.execute(1, 10, 100);

    expect(result).toBe(false);
  });

  it('debería permitir el voto si hay una falla en el caché para no arruinar la experiencia', async () => {
    jest
      .spyOn(cacheService, 'checkAndSetDuplicate')
      .mockRejectedValue(new Error('Redis Down'));

    const result = await websocket.execute(1, 10, 100);

    expect(result).toBe(true);
  });
});
