import { Test, TestingModule } from '@nestjs/testing';
import {
  ProcessAudienceVoteUseCase,
  VotePayload,
} from './process-audience-vote.use-case';
import { ValidateVoteUniquenessUseCase } from './validate-vote-uniqueness.use-case';
import { VotosService } from '../../votos/votos.service';

describe('ProcessAudienceVoteUseCase', () => {
  let useCase: ProcessAudienceVoteUseCase;
  let validateUniqueness: ValidateVoteUniquenessUseCase;
  let votosService: VotosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessAudienceVoteUseCase,
        {
          provide: ValidateVoteUniquenessUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: VotosService,
          useValue: {
            registrarVoto: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ProcessAudienceVoteUseCase>(
      ProcessAudienceVoteUseCase,
    );
    validateUniqueness = module.get<ValidateVoteUniquenessUseCase>(
      ValidateVoteUniquenessUseCase,
    );
    votosService = module.get<VotosService>(VotosService);
  });

  const mockPayload: VotePayload = {
    salaId: 1,
    tokenCompartido: 'abc-123',
    preguntaId: 10,
    participanteId: 100,
    opcionId: 5,
  };

  it('debería procesar el voto exitosamente si es permitido', async () => {
    jest.spyOn(validateUniqueness, 'execute').mockResolvedValue(true);
    jest.spyOn(votosService, 'registrarVoto').mockResolvedValue(undefined);

    const result = await useCase.execute(mockPayload);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Voto registrado correctamente.');
    expect(votosService.registrarVoto).toHaveBeenCalledWith(1, 10, 100, 5);
  });

  it('debería rechazar el voto si es duplicado', async () => {
    jest.spyOn(validateUniqueness, 'execute').mockResolvedValue(false);

    const result = await useCase.execute(mockPayload);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Acción bloqueada');
    expect(votosService.registrarVoto).not.toHaveBeenCalled();
  });
});
