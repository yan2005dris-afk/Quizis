import { Test, TestingModule } from '@nestjs/testing';
import { ComodinesService } from './comodines.service';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './use-cases/eliminate-options-5050.use-case';

describe('ComodinesService', () => {
  let service: ComodinesService;
  let getIaSuggestionUseCase: GetIaSuggestionUseCase;
  let selectRandomConsultantUseCase: SelectRandomConsultantUseCase;
  let getPublicVoteResultsUseCase: GetPublicVoteResultsUseCase;
  let eliminateOptions5050UseCase: EliminateOptions5050UseCase;

  const mockGetIaSuggestionUseCase = { execute: jest.fn() };
  const mockSelectRandomConsultantUseCase = { execute: jest.fn() };
  const mockGetPublicVoteResultsUseCase = { execute: jest.fn() };
  const mockEliminateOptions5050UseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinesService,
        {
          provide: GetIaSuggestionUseCase,
          useValue: mockGetIaSuggestionUseCase,
        },
        {
          provide: SelectRandomConsultantUseCase,
          useValue: mockSelectRandomConsultantUseCase,
        },
        {
          provide: GetPublicVoteResultsUseCase,
          useValue: mockGetPublicVoteResultsUseCase,
        },
        {
          provide: EliminateOptions5050UseCase,
          useValue: mockEliminateOptions5050UseCase,
        },
      ],
    }).compile();

    service = module.get<ComodinesService>(ComodinesService);
    getIaSuggestionUseCase = module.get<GetIaSuggestionUseCase>(
      GetIaSuggestionUseCase,
    );
    selectRandomConsultantUseCase = module.get<SelectRandomConsultantUseCase>(
      SelectRandomConsultantUseCase,
    );
    getPublicVoteResultsUseCase = module.get<GetPublicVoteResultsUseCase>(
      GetPublicVoteResultsUseCase,
    );
    eliminateOptions5050UseCase = module.get<EliminateOptions5050UseCase>(
      EliminateOptions5050UseCase,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('obtenerSugerenciaIa should delegate to GetIaSuggestionUseCase', async () => {
    const preguntaId = 1;
    await service.obtenerSugerenciaIa(preguntaId);
    expect(getIaSuggestionUseCase.execute).toHaveBeenCalledWith(preguntaId);
  });

  it('seleccionarConsultorAleatorio should delegate to SelectRandomConsultantUseCase', async () => {
    const token = 'token';
    await service.seleccionarConsultorAleatorio(token);
    expect(selectRandomConsultantUseCase.execute).toHaveBeenCalledWith(token);
  });

  it('obtenerResultadosPublico should delegate to GetPublicVoteResultsUseCase', async () => {
    const rondaId = 1;
    const preguntaId = 1;
    await service.obtenerResultadosPublico(rondaId, preguntaId);
    expect(getPublicVoteResultsUseCase.execute).toHaveBeenCalledWith(
      rondaId,
      preguntaId,
    );
  });

  it('eliminateOptions5050 should delegate to EliminateOptions5050UseCase', async () => {
    const preguntaId = 1;
    await service.eliminateOptions5050(preguntaId);
    expect(eliminateOptions5050UseCase.execute).toHaveBeenCalledWith(preguntaId);
  });
});
