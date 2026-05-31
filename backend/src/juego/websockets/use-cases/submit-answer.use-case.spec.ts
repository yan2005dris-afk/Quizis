import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitAnswerUseCase } from './submit-answer.use-case';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { RecordAnswerUseCase } from '../../respuestas/use-cases/record-answer.use-case';
import { ConsensusCacheUseCase } from 'src/infrastructure/cache/use-cases/consensus-cache.use-case';
import { EvaluateConsensusUseCase } from './evaluate-consensus.use-case';

describe('SubmitAnswerUseCase', () => {
  let useCase: SubmitAnswerUseCase;
  let cacheService: typeof mockCacheService;
  let recordAnswerUseCase: typeof mockRecordAnswerUseCase;
  let consensusCache: typeof mockConsensusCacheUseCase;

  const mockCacheService = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
    setQuestionStatus: jest.fn(),
  };

  const mockRecordAnswerUseCase = {
    execute: jest.fn(),
  };

  const mockConsensusCacheUseCase = {
    recordVote: jest.fn(),
    clearConsensus: jest.fn(),
  };

  const mockEvaluateConsensusUseCase = {
    execute: jest.fn(),
  };

  const mockQuestion = {
    preguntaId: 1,
    texto: 'Pregunta de prueba',
    nivel: 'facil',
    feedbackCorrecto: '¡Muy bien!',
    feedbackIncorrecto: 'Incorrecto, la respuesta era A.',
    opciones: [
      { opcionId: 10, texto: 'Opción A', esCorrecta: true },
      { opcionId: 11, texto: 'Opción B', esCorrecta: false },
      { opcionId: 12, texto: 'Opción C', esCorrecta: false },
    ],
  };

  const basePayload = {
    tokenCompartido: 'token-abc',
    rondaId: 1,
    preguntaId: 1,
    opcionId: 10,
    nickname: 'jugador1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitAnswerUseCase,
        { provide: RoomStateCacheUseCase, useValue: mockCacheService },
        { provide: RecordAnswerUseCase, useValue: mockRecordAnswerUseCase },
        { provide: ConsensusCacheUseCase, useValue: mockConsensusCacheUseCase },
        {
          provide: EvaluateConsensusUseCase,
          useValue: mockEvaluateConsensusUseCase,
        },
      ],
    }).compile();

    useCase = module.get<SubmitAnswerUseCase>(SubmitAnswerUseCase);
    cacheService = module.get(RoomStateCacheUseCase);
    recordAnswerUseCase = module.get(RecordAnswerUseCase);
    consensusCache = module.get(ConsensusCacheUseCase);
    jest.clearAllMocks();
  });

  describe('flujo single (un solo estudiante requerido)', () => {
    it('respuesta correcta → esCorrecta true, feedback correcto, status → answered', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await useCase.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('single');
      if (result.status === 'single') {
        expect(result.esCorrecta).toBe(true);
        expect(result.feedback).toBe('¡Muy bien!');
      }
      expect(cacheService.setQuestionStatus).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('respuesta incorrecta → esCorrecta false, feedback incorrecto', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 11,
      });

      const result = await useCase.execute({ ...basePayload, opcionId: 11 });

      expect(result.status).toBe('single');
      if (result.status === 'single') {
        expect(result.esCorrecta).toBe(false);
        expect(result.feedback).toBe('Incorrecto, la respuesta era A.');
      }
    });
  });

  describe('flujo pending (aún no votaron todos)', () => {
    it('devuelve status pending con conteos correctos', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 3,
      });

      const result = await useCase.execute(basePayload);

      expect(result.status).toBe('pending');
      if (result.status === 'pending') {
        expect(result.votosRecibidos).toBe(1);
        expect(result.totalRequeridos).toBe(3);
      }
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
      expect(cacheService.setQuestionStatus).not.toHaveBeenCalled();
    });
  });

  describe('flujo no-majority (sin mayoría)', () => {
    it('limpia el consenso y devuelve status no-majority', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.clearConsensus.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'no-majority',
        votosRecibidos: 2,
        totalRequeridos: 2,
      });

      const result = await useCase.execute(basePayload);

      expect(result.status).toBe('no-majority');
      expect(consensusCache.clearConsensus).toHaveBeenCalledWith(
        'token-abc',
        1,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('flujo majority (mayoría de estudiantes)', () => {
    it('todos votan, hay mayoría → esCorrecta retornada, status → answered', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 10,
        votosRecibidos: 3,
        totalRequeridos: 3,
      });

      const result = await useCase.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('majority');
      if (result.status === 'majority') {
        expect(result.esCorrecta).toBe(true);
        expect(result.feedback).toBe('¡Muy bien!');
        expect(result.winningOpcionId).toBe(10);
      }
      expect(cacheService.setQuestionStatus).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('todos votan, mayoría vota opción incorrecta → esCorrecta false', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 11,
        votosRecibidos: 2,
        totalRequeridos: 3,
      });

      const result = await useCase.execute({ ...basePayload, opcionId: 11 });

      expect(result.status).toBe('majority');
      if (result.status === 'majority') {
        expect(result.esCorrecta).toBe(false);
        expect(result.feedback).toBe('Incorrecto, la respuesta era A.');
      }
    });
  });

  describe('casos borde adicionales', () => {
    it('voto después de que la pregunta ya fue respondida (status answered) → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('answered');

      await expect(useCase.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockConsensusCacheUseCase.recordVote).not.toHaveBeenCalled();
    });

    it('un solo estudiante requerido (single) → evaluateConsensus retorna single, persiste y responde', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await useCase.execute(basePayload);

      expect(result.status).toBe('single');
      expect(recordAnswerUseCase.execute).toHaveBeenCalled();
      expect(cacheService.setQuestionStatus).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('2 de 3 votaron → pending, NO persiste en DB, NO cambia status', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 2,
        totalRequeridos: 3,
      });

      const result = await useCase.execute(basePayload);

      expect(result.status).toBe('pending');
      if (result.status === 'pending') {
        expect(result.votosRecibidos).toBe(2);
        expect(result.totalRequeridos).toBe(3);
      }
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
      expect(cacheService.setQuestionStatus).not.toHaveBeenCalled();
    });

    it('todos votan, sin mayoría → clearConsensus llamado, status no-majority', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.clearConsensus.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'no-majority',
        votosRecibidos: 3,
        totalRequeridos: 3,
      });

      const result = await useCase.execute(basePayload);

      expect(result.status).toBe('no-majority');
      expect(consensusCache.clearConsensus).toHaveBeenCalledWith(
        'token-abc',
        1,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('validaciones existentes', () => {
    it('sin pregunta activa → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(null);

      await expect(useCase.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('preguntaId no coincide con activa → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue({
        ...mockQuestion,
        preguntaId: 999,
      });

      await expect(useCase.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('status ya answered → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('answered');

      await expect(useCase.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('opcionId no existe en pregunta → NotFoundException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');

      await expect(
        useCase.execute({ ...basePayload, opcionId: 999 }),
      ).rejects.toThrow(NotFoundException);
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('con comodinUsado → pasa el comodin a RecordAnswerUseCase', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      await useCase.execute({
        ...basePayload,
        opcionId: 10,
        comodinUsado: '50/50',
      });

      expect(recordAnswerUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ comodinUsado: '50/50' }),
      );
    });

    it('persiste en DB con todos los campos correctos', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheUseCase.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusUseCase.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      await useCase.execute({ ...basePayload, opcionId: 10 });

      expect(recordAnswerUseCase.execute).toHaveBeenCalledWith({
        rondaId: 1,
        preguntaId: 1,
        opcionId: 10,
        esCorrecta: true,
        comodinUsado: null,
      });
    });
  });
});
