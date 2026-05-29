import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ConsensusCacheUseCase } from '../../../infrastructure/cache/use-cases/consensus-cache.use-case';
import { ConsensusResult, EvaluateConsensusUseCase } from './evaluate-consensus.use-case';

@Injectable()
export class JoinRoomUseCase {
  private readonly logger = new Logger(JoinRoomUseCase.name);

  constructor(
    private readonly cacheService: ParticipantsCacheUseCase,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly consensusCache: ConsensusCacheUseCase,
    private readonly evaluateConsensus: EvaluateConsensusUseCase,
  ) {}

  async execute(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
    rol?: string;
  }): Promise<{
    tokenCompartido: string;
    nickname: string;
    participants: string[];
    consensusResult?: ConsensusResult;
  }> {
    this.logger.log(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido} (Socket: ${payload.socketId})`,
    );

    await this.cacheService.addParticipantOnline(
      payload.tokenCompartido,
      payload.nombre,
    );

    const participants = await this.cacheService.getOnlineParticipants(
      payload.tokenCompartido,
    );

    // Check if there is an active question with status 'released' and participant is a student
    const [activeQuestion, questionStatus] = await Promise.all([
      this.roomStateCache.getActiveQuestion(payload.tokenCompartido),
      this.roomStateCache.getQuestionStatus(payload.tokenCompartido),
    ]);

    if (
      !activeQuestion ||
      questionStatus !== 'released' ||
      payload.rol !== 'estudiante'
    ) {
      return {
        tokenCompartido: payload.tokenCompartido,
        nickname: payload.nombre,
        participants,
      };
    }

    const preguntaId: number = activeQuestion.preguntaId;

    // Re-add this participant to the required voter set (reconnect scenario)
    await this.consensusCache.addToRequired(
      payload.tokenCompartido,
      preguntaId,
      payload.nombre,
    );

    this.logger.log(
      `${payload.nombre} re-agregado al conjunto requerido (reconexión) — preguntaId: ${preguntaId}`,
    );

    // Evaluate consensus — they may have voted before disconnecting
    const consensusResult = await this.evaluateConsensus.execute(
      payload.tokenCompartido,
      preguntaId,
    );

    return {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
      participants,
      consensusResult,
    };
  }
}
