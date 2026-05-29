import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ConsensusCacheUseCase } from '../../../infrastructure/cache/use-cases/consensus-cache.use-case';
import { ConsensusResult, EvaluateConsensusUseCase } from './evaluate-consensus.use-case';

@Injectable()
export class HandleDisconnectUseCase {
  private readonly logger = new Logger(HandleDisconnectUseCase.name);

  constructor(
    private readonly cacheService: ParticipantsCacheUseCase,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly consensusCache: ConsensusCacheUseCase,
    private readonly evaluateConsensus: EvaluateConsensusUseCase,
  ) {}

  async execute(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }): Promise<{
    tokenCompartido: string;
    participants: string[];
    consensusResult?: ConsensusResult;
  }> {
    await this.cacheService.removeParticipantOnline(
      info.tokenCompartido,
      info.nickname,
    );

    const participants = await this.cacheService.getOnlineParticipants(
      info.tokenCompartido,
    );

    this.logger.log(
      `${info.nickname} salió de la sala ${info.tokenCompartido} (Socket: ${info.socketId})`,
    );

    // Check if there is an active question with status 'released'
    const [activeQuestion, questionStatus] = await Promise.all([
      this.roomStateCache.getActiveQuestion(info.tokenCompartido),
      this.roomStateCache.getQuestionStatus(info.tokenCompartido),
    ]);

    if (!activeQuestion || questionStatus !== 'released') {
      return { tokenCompartido: info.tokenCompartido, participants };
    }

    const preguntaId: number = activeQuestion.preguntaId;

    // Check if this participant has already voted
    const votes = await this.consensusCache.getVotes(
      info.tokenCompartido,
      preguntaId,
    );

    const hasVoted = votes.has(info.nickname);

    if (!hasVoted) {
      // Remove from required set — they disconnected before voting
      await this.consensusCache.removeFromRequired(
        info.tokenCompartido,
        preguntaId,
        info.nickname,
      );
      this.logger.log(
        `${info.nickname} removido del conjunto requerido (desconexión sin votar) — preguntaId: ${preguntaId}`,
      );
    } else {
      // Vote stays — do not remove from required
      this.logger.log(
        `${info.nickname} ya había votado — voto retenido en el consenso — preguntaId: ${preguntaId}`,
      );
    }

    const consensusResult = await this.evaluateConsensus.execute(
      info.tokenCompartido,
      preguntaId,
    );

    return { tokenCompartido: info.tokenCompartido, participants, consensusResult };
  }
}
