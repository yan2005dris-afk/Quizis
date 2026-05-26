import { Test, TestingModule } from '@nestjs/testing';
import { ValidateVoteUniquenessUseCase } from './validate-vote-uniqueness.use-case';
import { ConfigService } from '@nestjs/config';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

describe('ValidateVoteUniquenessUseCase', () => {
  let useCase: ValidateVoteUniquenessUseCase;
  let cacheService: ParticipantsCacheUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateVoteUniquenessUseCase,
        {
          provide: ParticipantsCacheUseCase,
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

    useCase = module.get<ValidateVoteUniquenessUseCase>(
      ValidateVoteUniquenessUseCase,
    );
    cacheService = module.get<ParticipantsCacheUseCase>(
      ParticipantsCacheUseCase,
    );
  });

  it('debería retornar true si el voto es nuevo (no duplicado)', async () => {
    jest.spyOn(cacheService, 'checkAndSetDuplicate').mockResolvedValue(true);

    const result = await useCase.execute(1, 10, 100);

    expect(result).toBe(true);
    expect(cacheService.checkAndSetDuplicate).toHaveBeenCalledWith(
      'votes:check:1:10',
      '100',
      3600,
    );
  });

  it('debería retornar false si el voto ya existe (duplicado)', async () => {
    jest.spyOn(cacheService, 'checkAndSetDuplicate').mockResolvedValue(false);

    const result = await useCase.execute(1, 10, 100);

    expect(result).toBe(false);
  });

  it('debería permitir el voto si hay una falla en el caché para no arruinar la experiencia', async () => {
    jest
      .spyOn(cacheService, 'checkAndSetDuplicate')
      .mockRejectedValue(new Error('Redis Down'));

    const result = await useCase.execute(1, 10, 100);

    expect(result).toBe(true);
  });
});
