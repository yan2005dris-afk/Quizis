import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';
import { RoomStateCacheService } from '../../salas/cache/room-state-cache.service';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import {
  ConsensusResult,
  EvaluateConsensusUseCase,
} from './evaluate-consensus.use-case';

@Injectable()
export class HandleDisconnectUseCase {
  private readonly logger = new Logger(HandleDisconnectUseCase.name);

  constructor(
    private readonly cacheService: ParticipantsCacheService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly consensusCache: ConsensusCacheService,
    private readonly evaluateConsensus: EvaluateConsensusUseCase,
  ) {}

  async execute(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }): Promise<{
    tokenCompartido: string;
    participants: string[];
    consensus?: { preguntaId: number; result: ConsensusResult };
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

    return {
      tokenCompartido: info.tokenCompartido,
      participants,
      consensus: { preguntaId, result: consensusResult },
    };
  }
}
