import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameEvents } from '../../../core/common/events/game-events.types';
import { ComodinesService } from './comodines.service';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './use-cases/eliminate-options-5050.use-case';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { HelperCacheService } from '../infrastructure/cache/helper-cache.service';

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
  const mockEventEmitter = { emit: jest.fn() };
  const mockPrisma = {
    preguntas: { findUnique: jest.fn() },
  };
  const mockHelperCacheService = {
    setActiveHelper: jest.fn(),
    getActiveHelper: jest.fn(),
    clearHelper: jest.fn(),
  };

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
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HelperCacheService, useValue: mockHelperCacheService },
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

  afterEach(() => {
    jest.clearAllMocks();
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
    expect(eliminateOptions5050UseCase.execute).toHaveBeenCalledWith(
      preguntaId,
    );
  });

  // ─── BUG 3: IA suggestion broadcast to all participants ─────────────

  describe('Bug 3 — IA broadcast to all participants', () => {
    it('should emit comodin.ia.suggestion event after IA suggestion', async () => {
      mockGetIaSuggestionUseCase.execute.mockResolvedValue({
        literal: 'A',
        explicacion: 'La opción A es correcta porque...',
      });
      mockPrisma.preguntas.findUnique.mockResolvedValue({
        preguntaId: 1,
        texto: 'Test',
        opciones: [],
        respuestasRonda: [
          {
            ronda: {
              numeroRonda: 1,
              sala: { tokenCompartido: 'test-token-123' },
            },
          },
        ],
      });

      await service.obtenerSugerenciaIa(1);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GameEvents.COMODINES.IA_SUGGESTION,
        {
          preguntaId: 1,
          literal: 'A',
          explicacion: 'La opción A es correcta porque...',
          tokenCompartido: 'test-token-123',
        },
      );
    });

    it('should NOT emit when pregunta has no sala token', async () => {
      mockGetIaSuggestionUseCase.execute.mockResolvedValue({
        literal: 'B',
        explicacion: 'Test',
      });
      mockPrisma.preguntas.findUnique.mockResolvedValue({
        preguntaId: 1,
        texto: 'Test',
        opciones: [],
        respuestasRonda: [],
      });

      await service.obtenerSugerenciaIa(1);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should still return IA suggestion even when sala lookup returns null', async () => {
      mockGetIaSuggestionUseCase.execute.mockResolvedValue({
        literal: 'C',
        explicacion: 'Third option',
      });
      mockPrisma.preguntas.findUnique.mockResolvedValue({
        preguntaId: 1,
        texto: 'Test',
        opciones: [],
        respuestasRonda: [],
      });

      const result = await service.obtenerSugerenciaIa(1);
      expect(result).toEqual({ literal: 'C', explicacion: 'Third option' });
    });
  });
});
