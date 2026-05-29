import { Test, TestingModule } from '@nestjs/testing';
import { HandleDisconnectUseCase } from './handle-disconnect.use-case';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ConsensusCacheUseCase } from '../../../infrastructure/cache/use-cases/consensus-cache.use-case';
import { EvaluateConsensusUseCase } from './evaluate-consensus.use-case';

describe('HandleDisconnectUseCase', () => {
  let useCase: HandleDisconnectUseCase;

  const mockParticipantsCache = {
    removeParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
  };

  const mockConsensusCache = {
    getVotes: jest.fn(),
    removeFromRequired: jest.fn(),
  };

  const mockEvaluateConsensus = {
    execute: jest.fn(),
  };

  const mockActiveQuestion = { preguntaId: 1, texto: 'Pregunta activa' };

  const baseInfo = {
    tokenCompartido: 'token-abc',
    nickname: 'alice',
    socketId: 'socket-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleDisconnectUseCase,
        { provide: ParticipantsCacheUseCase, useValue: mockParticipantsCache },
        { provide: RoomStateCacheUseCase, useValue: mockRoomStateCache },
        { provide: ConsensusCacheUseCase, useValue: mockConsensusCache },
        { provide: EvaluateConsensusUseCase, useValue: mockEvaluateConsensus },
      ],
    }).compile();

    useCase = module.get<HandleDisconnectUseCase>(HandleDisconnectUseCase);
    jest.clearAllMocks();
  });

  // ─── caso base ─────────────────────────────────────────────────────────────

  it('remueve participante online y retorna lista actualizada', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue([]);
    mockRoomStateCache.getActiveQuestion.mockResolvedValue(null);
    mockRoomStateCache.getQuestionStatus.mockResolvedValue(null);

    await useCase.execute(baseInfo);

    expect(mockParticipantsCache.removeParticipantOnline).toHaveBeenCalledWith(
      'token-abc',
      'alice',
    );
  });

  // ─── sin pregunta activa ────────────────────────────────────────────────────

  describe('sin pregunta activa', () => {
    it('no llama lógica de consenso si no hay pregunta activa', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(null);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue(null);

      const result = await useCase.execute(baseInfo);

      expect(mockConsensusCache.getVotes).not.toHaveBeenCalled();
      expect(mockConsensusCache.removeFromRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });

    it('no llama lógica de consenso si la pregunta está en estado answered', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(mockActiveQuestion);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('answered');

      const result = await useCase.execute(baseInfo);

      expect(mockConsensusCache.getVotes).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).not.toHaveBeenCalled();
      expect(result.consensusResult).toBeUndefined();
    });
  });

  // ─── desconexión antes de votar ────────────────────────────────────────────

  describe('desconexión antes de votar', () => {
    it('llama removeFromRequired, luego evaluateConsensus, retorna consensusResult', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(mockActiveQuestion);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');
      // alice has NOT voted
      mockConsensusCache.getVotes.mockResolvedValue(new Map([['bob', 10]]));
      mockConsensusCache.removeFromRequired.mockResolvedValue(undefined);
      mockEvaluateConsensus.execute.mockResolvedValue({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 1,
      });

      const result = await useCase.execute(baseInfo);

      expect(mockConsensusCache.removeFromRequired).toHaveBeenCalledWith(
        'token-abc',
        1,
        'alice',
      );
      expect(mockEvaluateConsensus.execute).toHaveBeenCalledWith('token-abc', 1);
      expect(result.consensusResult).toEqual({
        type: 'pending',
        votosRecibidos: 1,
        totalRequeridos: 1,
      });
    });
  });

  // ─── desconexión después de votar ──────────────────────────────────────────

  describe('desconexión después de votar', () => {
    it('NO llama removeFromRequired, voto se retiene, evaluateConsensus sí se llama', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(mockActiveQuestion);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');
      // alice HAS voted
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 10],
        ]),
      );
      mockEvaluateConsensus.execute.mockResolvedValue({
        type: 'majority',
        winningOpcionId: 10,
        votosRecibidos: 2,
        totalRequeridos: 2,
      });

      const result = await useCase.execute(baseInfo);

      expect(mockConsensusCache.removeFromRequired).not.toHaveBeenCalled();
      expect(mockEvaluateConsensus.execute).toHaveBeenCalledWith('token-abc', 1);
      expect(result.consensusResult).toEqual({
        type: 'majority',
        winningOpcionId: 10,
        votosRecibidos: 2,
        totalRequeridos: 2,
      });
    });
  });

  // ─── resultado retornado ────────────────────────────────────────────────────

  describe('estructura del resultado', () => {
    it('retorna tokenCompartido, participants y consensusResult cuando hay pregunta activa', async () => {
      mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['bob']);
      mockRoomStateCache.getActiveQuestion.mockResolvedValue(mockActiveQuestion);
      mockRoomStateCache.getQuestionStatus.mockResolvedValue('released');
      mockConsensusCache.getVotes.mockResolvedValue(new Map());
      mockConsensusCache.removeFromRequired.mockResolvedValue(undefined);
      mockEvaluateConsensus.execute.mockResolvedValue({
        type: 'single',
        winningOpcionId: 10,
      });

      const result = await useCase.execute(baseInfo);

      expect(result.tokenCompartido).toBe('token-abc');
      expect(result.participants).toEqual(['bob']);
      expect(result.consensusResult).toBeDefined();
    });
  });
});
