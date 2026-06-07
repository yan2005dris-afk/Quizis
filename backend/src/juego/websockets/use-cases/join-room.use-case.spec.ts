import { Test, TestingModule } from '@nestjs/testing';
import { JoinRoomUseCase } from './join-room.use-case';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';
import { RoomStateCacheService } from '../../salas/cache/room-state-cache.service';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import { EvaluateConsensusUseCase } from './evaluate-consensus.use-case';
import { SalasService } from '../../salas/salas.service';

describe('JoinRoomUseCase', () => {
  let useCase: JoinRoomUseCase;

  const mockParticipantsCache = {
    addParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
  };

  const mockConsensusCache = {
    addToRequired: jest.fn(),
  };

  const mockEvaluateConsensus = {
    execute: jest.fn(),
  };

  const mockSalasService = {
    getParticipantsWithRoles: jest.fn(),
  };

  const mockActiveQuestion = { preguntaId: 1, texto: 'Pregunta activa' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRoomUseCase,
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: RoomStateCacheService, useValue: mockRoomStateCache },
        { provide: ConsensusCacheService, useValue: mockConsensusCache },
        { provide: EvaluateConsensusUseCase, useValue: mockEvaluateConsensus },
        { provide: SalasService, useValue: mockSalasService },
      ],
    }).compile();

    useCase = module.get<JoinRoomUseCase>(JoinRoomUseCase);
    jest.clearAllMocks();
  });

  // ─── caso base ─────────────────────────────────────────────────────────────

  it('registra participante online y retorna nickname y participants', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['User1']);
    mockSalasService.getParticipantsWithRoles.mockResolvedValue([]);
    mockRoomStateCache.getActiveQuestion.mockResolvedValue(null);
    mockRoomStateCache.getQuestionStatus.mockResolvedValue(null);

    const result = await useCase.execute({
      tokenCompartido: 'T1',
      nombre: 'User1',
      socketId: 'S1',
    });

    expect(result).toEqual({
      tokenCompartido: 'T1',
      nickname: 'User1',
      participants: ['User1'],
    });
    expect(mockParticipantsCache.addParticipantOnline).toHaveBeenCalledWith(
      'T1',
      'User1',
    );
  });

  // ─── sin pregunta activa ────────────────────────────────────────────────────

  describe('sin pregunta activa', () => {
    it('omite lógica de consenso si no hay pregunta activa', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['alice']);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([
        { nombre: 'alice', rol: 'estudiante' },
      ]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(null);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue(null);

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensus).toBeUndefined();
    });

    it('omite lógica de consenso si la pregunta ya fue respondida (status answered)', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['alice']);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([
        { nombre: 'alice', rol: 'estudiante' },
      ]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('answered');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensus).toBeUndefined();
    });
  });

  // ─── reconexión como profesor ──────────────────────────────────────────────

  describe('profesor reconectándose', () => {
    it('omite consenso si el rol NO es estudiante', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['prof']);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([
        { nombre: 'prof', rol: 'profesor' },
      ]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'prof',
        socketId: 'S1',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensus).toBeUndefined();
    });

    it('omite consenso si el participante no está en DB (rol undefined)', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['guest']);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'guest',
        socketId: 'S1',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensus).toBeUndefined();
    });
  });

  // ─── reconexión como estudiante con pregunta activa ────────────────────────

  describe('estudiante reconectándose con pregunta activa (status released)', () => {
    it('llama addToRequired, luego evaluateConsensus y retorna consensus', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue([
        'alice',
        'bob',
      ]);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([
        { nombre: 'alice', rol: 'estudiante' },
        { nombre: 'bob', rol: 'estudiante' },
      ]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCache.addToRequired.mockResolvedValue(undefined);
      mockEvaluateConsensus.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 2,
      });

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
      });

      expect(mockConsensusCache.addToRequired).toHaveBeenCalledWith(
        'token-abc',
        1,
        'alice',
      );
      expect(mockEvaluateConsensus.execute).toHaveBeenCalledWith(
        'token-abc',
        1,
      );
      expect(result.consensus).toEqual({
        preguntaId: 1,
        result: {
          type: 'pending',
          votosRecibidos: 1,
          totalRequeridos: 2,
        },
      });
    });

    it('retorna consensus de tipo single si solo ese estudiante es requerido', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['alice']);
      mockSalasService.getParticipantsWithRoles.mockResolvedValue([
        { nombre: 'alice', rol: 'estudiante' },
      ]);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCache.addToRequired.mockResolvedValue(undefined);
      mockEvaluateConsensus.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
      });

      expect(result.consensus).toEqual({
        preguntaId: 1,
        result: {
          type: 'single',
          winningOpcionId: 10,
        },
      });
      expect(result.nickname).toBe('alice');
    });
  });
});
