import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import {
  GameEvents,
} from '../../../../core/common/events/game-events.types';
import type {
  ParticipanteJoinedEvent,
  ParticipanteDisconnectedEvent,
} from '../../../../core/common/events/game-events.types';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import { EvaluateConsensusWebsocket } from '../websockets/evaluate-consensus.websocket';
import { RoomStateCacheService } from '../../../salas/infrastructure/cache/room-state-cache.service';
import { SalasService } from '../../../salas/application/salas.service';

@Injectable()
export class ConsensusListener {
  private readonly logger = new Logger(ConsensusListener.name);

  constructor(
    private readonly consensusCache: ConsensusCacheService,
    private readonly evaluateConsensus: EvaluateConsensusWebsocket,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly salasService: SalasService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(GameEvents.SALA.PARTICIPANTE_UNIDO)
  async handleParticipantJoined(event: ParticipanteJoinedEvent) {
    const { tokenCompartido, nickname } = event;

    const [activeQuestion, questionStatus] = await Promise.all([
      this.roomStateCache.getActiveQuestion(tokenCompartido),
      this.roomStateCache.getQuestionStatus(tokenCompartido),
    ]);

    if (!activeQuestion || questionStatus !== 'released') return;

    // Check if participant is a student
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      tokenCompartido,
      [nickname],
    );
    const rol = participantesDb[0]?.rol;

    if (rol === 'estudiante') {
      await this.consensusCache.addToRequired(
        tokenCompartido,
        activeQuestion.preguntaId,
        nickname,
      );
      this.logger.log(
        `[EVENT:JOIN] ${nickname} re-agregado al consenso en sala ${tokenCompartido}`,
      );

      const result = await this.evaluateConsensus.execute(
        tokenCompartido,
        activeQuestion.preguntaId,
      );
      this.eventEmitter.emit(GameEvents.VOTOS.CONSENSO_EVALUADO, {
        tokenCompartido,
        preguntaId: activeQuestion.preguntaId,
        result,
      });
    }
  }

  @OnEvent(GameEvents.SALA.PARTICIPANTE_DESCONECTADO)
  async handleParticipantDisconnected(event: ParticipanteDisconnectedEvent) {
    const { tokenCompartido, nickname } = event;

    const [activeQuestion, questionStatus] = await Promise.all([
      this.roomStateCache.getActiveQuestion(tokenCompartido),
      this.roomStateCache.getQuestionStatus(tokenCompartido),
    ]);

    if (!activeQuestion || questionStatus !== 'released') return;

    const preguntaId = activeQuestion.preguntaId;
    const votes = await this.consensusCache.getVotes(
      tokenCompartido,
      preguntaId,
    );

    if (!votes.has(nickname)) {
      await this.consensusCache.removeFromRequired(
        tokenCompartido,
        preguntaId,
        nickname,
      );
      this.logger.log(
        `[EVENT:DISCONNECT] ${nickname} removido del consenso (no votó) en sala ${tokenCompartido}`,
      );
    }

    const result = await this.evaluateConsensus.execute(
      tokenCompartido,
      preguntaId,
    );
    this.eventEmitter.emit(GameEvents.VOTOS.CONSENSO_EVALUADO, {
      tokenCompartido,
      preguntaId,
      result,
    });
  }
}
