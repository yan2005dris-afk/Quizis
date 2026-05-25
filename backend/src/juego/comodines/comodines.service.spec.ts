import { Test, TestingModule } from '@nestjs/testing';
import { ComodinesService } from './comodines.service';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';

describe('ComodinesService', () => {
  let service: ComodinesService;
  let getIaSuggestionUseCase: GetIaSuggestionUseCase;
  let selectRandomConsultantUseCase: SelectRandomConsultantUseCase;
  let getPublicVoteResultsUseCase: GetPublicVoteResultsUseCase;

  const mockGetIaSuggestionUseCase = { execute: jest.fn() };
  const mockSelectRandomConsultantUseCase = { execute: jest.fn() };
  const mockGetPublicVoteResultsUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinesService,
        { provide: GetIaSuggestionUseCase, useValue: mockGetIaSuggestionUseCase },
        { provide: SelectRandomConsultantUseCase, useValue: mockSelectRandomConsultantUseCase },
        { provide: GetPublicVoteResultsUseCase, useValue: mockGetPublicVoteResultsUseCase },
      ],
    }).compile();

    service = module.get<ComodinesService>(ComodinesService);
    getIaSuggestionUseCase = module.get<GetIaSuggestionUseCase>(GetIaSuggestionUseCase);
    selectRandomConsultantUseCase = module.get<SelectRandomConsultantUseCase>(SelectRandomConsultantUseCase);
    getPublicVoteResultsUseCase = module.get<GetPublicVoteResultsUseCase>(GetPublicVoteResultsUseCase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('obtenerSugerenciaIa should delegate to GetIaSuggestionUseCase', async () => {
    const pregunta = 'test';
    await service.obtenerSugerenciaIa(pregunta);
    expect(getIaSuggestionUseCase.execute).toHaveBeenCalledWith(pregunta);
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
    expect(getPublicVoteResultsUseCase.execute).toHaveBeenCalledWith(rondaId, preguntaId);
  });
});
