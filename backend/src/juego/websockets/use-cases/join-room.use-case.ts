import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';
import { RoomStateCacheService } from '../../salas/cache/room-state-cache.service';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import { SalasService } from '../../salas/salas.service';
import {
  ConsensusResult,
  EvaluateConsensusUseCase,
} from './evaluate-consensus.use-case';

@Injectable()
export class JoinRoomUseCase {
  private readonly logger = new Logger(JoinRoomUseCase.name);

  constructor(
    private readonly cacheService: ParticipantsCacheService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly consensusCache: ConsensusCacheService,
    private readonly evaluateConsensus: EvaluateConsensusUseCase,
    private readonly salasService: SalasService,
  ) {}

  async execute(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }): Promise<{
    tokenCompartido: string;
    nickname: string;
    participants: string[];
    consensus?: { preguntaId: number; result: ConsensusResult };
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

    // Determine participant's role via DB
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      payload.tokenCompartido,
      participants,
    );
    const yo = participantesDb.find((p: any) => p.nombre === payload.nombre);
    const rol = yo?.rol;

    // Check if there is an active question with status 'released' and participant is a student
    const [activeQuestion, questionStatus] = await Promise.all([
      this.roomStateCache.getActiveQuestion(payload.tokenCompartido),
      this.roomStateCache.getQuestionStatus(payload.tokenCompartido),
    ]);

    if (
      !activeQuestion ||
      questionStatus !== 'released' ||
      rol !== 'estudiante'
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
      consensus: { preguntaId, result: consensusResult },
    };
  }
}
