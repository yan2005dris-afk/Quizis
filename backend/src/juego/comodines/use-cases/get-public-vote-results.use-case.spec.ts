import { Test, TestingModule } from '@nestjs/testing';
import { GetPublicVoteResultsUseCase } from './get-public-vote-results.use-case';
import { VotosService } from '../../votos/votos.service';

describe('GetPublicVoteResultsUseCase', () => {
  let useCase: GetPublicVoteResultsUseCase;
  let votosService: VotosService;

  const mockVotosService = {
    obtenerVotosCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPublicVoteResultsUseCase,
        { provide: VotosService, useValue: mockVotosService },
      ],
    }).compile();

    useCase = module.get<GetPublicVoteResultsUseCase>(GetPublicVoteResultsUseCase);
    votosService = module.get<VotosService>(VotosService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return correct vote tally', async () => {
    const rondaId = 1;
    const preguntaId = 1;
    const mockVotos = [
      { participanteId: 1, opcionId: 1 },
      { participanteId: 2, opcionId: 1 },
      { participanteId: 3, opcionId: 2 },
    ];
    mockVotosService.obtenerVotosCache.mockResolvedValue(mockVotos);

    const result = await useCase.execute(rondaId, preguntaId);

    expect(result).toEqual({
      totalVotos: 3,
      resultados: { 1: 2, 2: 1 },
    });
    expect(votosService.obtenerVotosCache).toHaveBeenCalledWith(rondaId, preguntaId);
  });

  it('should return zero votes when cache is empty', async () => {
    mockVotosService.obtenerVotosCache.mockResolvedValue([]);

    const result = await useCase.execute(1, 1);

    expect(result).toEqual({
      totalVotos: 0,
      resultados: {},
    });
  });
});
