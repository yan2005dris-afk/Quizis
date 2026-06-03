import { Test, TestingModule } from '@nestjs/testing';
import { JoinRoomUseCase } from './join-room.use-case';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ConsensusCacheUseCase } from '../../../infrastructure/cache/use-cases/consensus-cache.use-case';
import { EvaluateConsensusUseCase } from './evaluate-consensus.use-case';

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

  const mockActiveQuestion = { preguntaId: 1, texto: 'Pregunta activa' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRoomUseCase,
        { provide: ParticipantsCacheUseCase, useValue: mockParticipantsCache },
        { provide: RoomStateCacheUseCase, useValue: mockRoomStateCache },
        { provide: ConsensusCacheUseCase, useValue: mockConsensusCache },
        { provide: EvaluateConsensusUseCase, useValue: mockEvaluateConsensus },
      ],
    }).compile();

    useCase = module.get<JoinRoomUseCase>(JoinRoomUseCase);
    jest.clearAllMocks();
  });

  // ─── caso base ─────────────────────────────────────────────────────────────

  it('registra participante online y retorna nickname y participants', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['User1']);
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
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(null);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue(null);

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
        rol: 'estudiante',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });

    it('omite lógica de consenso si la pregunta ya fue respondida (status answered)', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['alice']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('answered');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'alice',
        socketId: 'S1',
        rol: 'estudiante',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });
  });

  // ─── reconexión como observador ────────────────────────────────────────────

  describe('observador reconectándose', () => {
    it('omite consenso si el rol NO es estudiante', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['prof']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'prof',
        socketId: 'S1',
        rol: 'profesor',
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });

    it('omite consenso si rol es undefined', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['guest']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(
        mockActiveQuestion,
      );
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');

      const result = await useCase.execute({
        tokenCompartido: 'token-abc',
        nombre: 'guest',
        socketId: 'S1',
        // rol omitted → undefined
      });

      expect(mockConsensusCache.addToRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });
  });

  // ─── reconexión como estudiante con pregunta activa ────────────────────────

  describe('estudiante reconectándose con pregunta activa (status released)', () => {
    it('llama addToRequired, luego evaluateConsensus y retorna consensusResult', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue([
        'alice',
        'bob',
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
        rol: 'estudiante',
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
      expect(result.consensusResult).toEqual({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 2,
      });
    });

    it('retorna consensusResult de tipo single si solo ese estudiante es requerido', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['alice']);
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
        rol: 'estudiante',
      });

      expect(result.consensusResult).toEqual({
        type: 'single',
        winningOpcionId: 10,
      });
      expect(result.nickname).toBe('alice');
    });
  });
});
