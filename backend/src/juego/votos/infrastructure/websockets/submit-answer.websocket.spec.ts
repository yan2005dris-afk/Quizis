import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitAnswerWebsocket } from './submit-answer.websocket';
import { RoomStateCacheService } from '../../../salas/infrastructure/cache/room-state-cache.service';
import { RecordAnswerUseCase } from '../../../respuestas/application/use-cases/record-answer.use-case';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import { EvaluateConsensusWebsocket } from './evaluate-consensus.websocket';

describe('SubmitAnswerWebsocket', () => {
  let websocket: SubmitAnswerWebsocket;
  let cacheService: typeof mockCacheService;
  let recordAnswerUseCase: typeof mockRecordAnswerUseCase;
  let consensusCache: typeof mockConsensusCacheService;

  const mockCacheService = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
    setQuestionStatus: jest.fn(),
    setQuestionStatusNX: jest.fn(),
  };

  const mockRecordAnswerUseCase = {
    execute: jest.fn(),
  };

  const mockConsensusCacheService = {
    recordVote: jest.fn(),
    clearConsensus: jest.fn(),
  };

  const mockEvaluateConsensusWebsocket = {
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
        SubmitAnswerWebsocket,
        { provide: RoomStateCacheService, useValue: mockCacheService },
        { provide: RecordAnswerUseCase, useValue: mockRecordAnswerUseCase },
        { provide: ConsensusCacheService, useValue: mockConsensusCacheService },
        {
          provide: EvaluateConsensusWebsocket,
          useValue: mockEvaluateConsensusWebsocket,
        },
      ],
    }).compile();

    websocket = module.get<SubmitAnswerWebsocket>(SubmitAnswerWebsocket);
    cacheService = module.get(RoomStateCacheService);
    recordAnswerUseCase = module.get(RecordAnswerUseCase);
    consensusCache = module.get(ConsensusCacheService);
    jest.clearAllMocks();
  });

  describe('flujo single (un solo estudiante requerido)', () => {
    it('respuesta correcta → esCorrecta true, feedback correcto, status → answered', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('single');
      if (result.status === 'single') {
        expect(result.esCorrecta).toBe(true);
        expect(result.feedback).toBe('¡Muy bien!');
      }
      expect(cacheService.setQuestionStatusNX).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('respuesta incorrecta → esCorrecta false, feedback incorrecto', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 11,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 11 });

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
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 3,
      });

      const result = await websocket.execute(basePayload);

      expect(result.status).toBe('pending');
      if (result.status === 'pending') {
        expect(result.votosRecibidos).toBe(1);
        expect(result.totalRequeridos).toBe(3);
      }
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
      expect(cacheService.setQuestionStatusNX).not.toHaveBeenCalled();
    });
  });

  describe('flujo no-majority (sin mayoría)', () => {
    it('limpia el consenso y devuelve status no-majority', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockConsensusCacheService.clearConsensus.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'no-majority',
        votosRecibidos: 2,
        totalRequeridos: 2,
      });

      const result = await websocket.execute(basePayload);

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
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 10,
        votosRecibidos: 3,
        totalRequeridos: 3,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('majority');
      if (result.status === 'majority') {
        expect(result.esCorrecta).toBe(true);
        expect(result.feedback).toBe('¡Muy bien!');
        expect(result.winningOpcionId).toBe(10);
      }
      expect(cacheService.setQuestionStatusNX).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('todos votan, mayoría vota opción incorrecta → esCorrecta false', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 11,
        votosRecibidos: 2,
        totalRequeridos: 3,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 11 });

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

      await expect(websocket.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockConsensusCacheService.recordVote).not.toHaveBeenCalled();
    });

    it('un solo estudiante requerido (single) → evaluateConsensus retorna single, persiste y responde', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await websocket.execute(basePayload);

      expect(result.status).toBe('single');
      expect(recordAnswerUseCase.execute).toHaveBeenCalled();
      expect(cacheService.setQuestionStatusNX).toHaveBeenCalledWith(
        'token-abc',
        'answered',
      );
    });

    it('2 de 3 votaron → pending, NO persiste en DB, NO cambia status', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 2,
        totalRequeridos: 3,
      });

      const result = await websocket.execute(basePayload);

      expect(result.status).toBe('pending');
      if (result.status === 'pending') {
        expect(result.votosRecibidos).toBe(2);
        expect(result.totalRequeridos).toBe(3);
      }
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
      expect(cacheService.setQuestionStatusNX).not.toHaveBeenCalled();
    });

    it('todos votan, sin mayoría → clearConsensus llamado, status no-majority', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockConsensusCacheService.clearConsensus.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'no-majority',
        votosRecibidos: 3,
        totalRequeridos: 3,
      });

      const result = await websocket.execute(basePayload);

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

      await expect(websocket.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('preguntaId no coincide con activa → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue({
        ...mockQuestion,
        preguntaId: 999,
      });

      await expect(websocket.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('status ya answered → BadRequestException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('answered');

      await expect(websocket.execute(basePayload)).rejects.toThrow(
        BadRequestException,
      );
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('opcionId no existe en pregunta → NotFoundException', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');

      await expect(
        websocket.execute({ ...basePayload, opcionId: 999 }),
      ).rejects.toThrow(NotFoundException);
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('con comodinUsado → pasa el comodin a RecordAnswerUseCase', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      await websocket.execute({
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
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      await websocket.execute({ ...basePayload, opcionId: 10 });

      expect(recordAnswerUseCase.execute).toHaveBeenCalledWith({
        rondaId: 1,
        preguntaId: 1,
        opcionId: 10,
        esCorrecta: true,
        comodinUsado: null,
      });
    });
  });

  // ─── sdd/quizis-timer-hardening AC-P1-05 ─────────────────────────
  // Race condition guard: if the timer path already claimed 'answered'
  // state via setQuestionStatusNX, the student answer path must bail
  // out with 'race-lost' status without double-persisting.

  describe('NX race-condition guard (AC-P1-05)', () => {
    it('returns race-lost when NX fails (timer won the race)', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(false);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 10,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('race-lost');
      expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
    });

    it('persists normally when NX wins (student won the race)', async () => {
      mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
      mockCacheService.getQuestionStatus.mockResolvedValue('released');
      mockCacheService.setQuestionStatusNX.mockResolvedValue(true);
      mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
      mockConsensusCacheService.recordVote.mockResolvedValue(undefined);
      mockEvaluateConsensusWebsocket.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 10,
      });

      const result = await websocket.execute({ ...basePayload, opcionId: 10 });

      expect(result.status).toBe('majority');
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
