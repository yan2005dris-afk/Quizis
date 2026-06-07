import { Injectable } from '@nestjs/common';
import { JoinRoomUseCase } from './use-cases/join-room.use-case';
import { HandleDisconnectUseCase } from './use-cases/handle-disconnect.use-case';
import {
  ProcessAudienceVoteUseCase,
  VotePayload,
} from './use-cases/process-audience-vote.use-case';
import { ReleaseQuestionUseCase } from './use-cases/release-question.use-case';
import {
  SubmitAnswerUseCase,
  AnswerPayload,
} from './use-cases/submit-answer.use-case';
import { ToggleRoomEnabledUseCase } from './use-cases/toggle-room-enabled.use-case';
import { SendMessageUseCase } from './use-cases/send-message.use-case';
import { ActivateCallJokerUseCase } from './use-cases/activate-call-joker.use-case';
import {
  SendHintUseCase,
  SendHintPayload,
} from './use-cases/send-hint.use-case';
import { SalasService } from '../salas/salas.service';
import { RoomStateCacheService } from '../salas/cache/room-state-cache.service';
import { ParticipantsCacheService } from '../salas/cache/participants-cache.service';
import { ConsensusCacheService } from './cache/consensus-cache.service';
import { ChatCacheService } from './cache/chat-cache.service';
import { HelperCacheService } from '../comodines/cache/helper-cache.service';

@Injectable()
export class WebsocketsService {
  constructor(
    private readonly joinRoomUseCase: JoinRoomUseCase,
    private readonly handleDisconnectUseCase: HandleDisconnectUseCase,
    private readonly processAudienceVoteUseCase: ProcessAudienceVoteUseCase,
    private readonly releaseQuestionUseCase: ReleaseQuestionUseCase,
    private readonly submitAnswerUseCase: SubmitAnswerUseCase,
    private readonly toggleRoomEnabledUseCase: ToggleRoomEnabledUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly activateCallJokerUseCase: ActivateCallJokerUseCase,
    private readonly sendHintUseCase: SendHintUseCase,
    private readonly salasService: SalasService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly participantsCache: ParticipantsCacheService,
    private readonly consensusCache: ConsensusCacheService,
    private readonly chatCache: ChatCacheService,
    private readonly helperCache: HelperCacheService,
  ) {}

  // ─── Use-case delegates ────────────────────────────────────────────────────

  async joinRoom(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }) {
    return this.joinRoomUseCase.execute(payload);
  }

  async handleDisconnect(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }) {
    return this.handleDisconnectUseCase.execute(info);
  }

  async processVote(payload: VotePayload) {
    return this.processAudienceVoteUseCase.execute(payload);
  }

  async releaseQuestion(token: string, pregunta: any) {
    return this.releaseQuestionUseCase.execute(token, pregunta);
  }

  async submitAnswer(payload: AnswerPayload) {
    return this.submitAnswerUseCase.execute(payload);
  }

  async toggleRoomEnabled(token: string, enabled: boolean) {
    return this.toggleRoomEnabledUseCase.execute(token, enabled);
  }

  async sendMessage(payload: {
    tokenCompartido: string;
    nickname: string;
    texto: string;
    tipo: 'mensaje' | 'sugerencia';
  }) {
    return this.sendMessageUseCase.execute(payload);
  }

  async activateCallJoker(tokenCompartido: string) {
    return this.activateCallJokerUseCase.execute(tokenCompartido);
  }

  async sendHint(payload: SendHintPayload) {
    return this.sendHintUseCase.execute(payload);
  }

  // ─── Sala operations ────────────────────────────────────────────────────────

  async regenerateToken(salaId: number) {
    return this.salasService.regenerarToken(salaId);
  }

  async finalizeGame(salaId: number) {
    return this.salasService.finalizarSala(salaId);
  }

  async changeParticipantRole(
    token: string,
    nickname: string,
    nuevoRol: string,
  ) {
    const nicknames = await this.participantsCache.getOnlineParticipants(token);
    await this.salasService.updateParticipantRole(
      token,
      nickname,
      nuevoRol,
      nicknames,
    );
    return this.salasService.getParticipantsWithRoles(token, nicknames);
  }

  // ─── Cache operations ───────────────────────────────────────────────────────

  async restartRound(tokenCompartido: string) {
    return this.roomStateCache.clearRoundState(tokenCompartido);
  }

  async blockPowerup(tokenCompartido: string, tipoComodin: string) {
    return this.roomStateCache.addBlockedComodin(tokenCompartido, tipoComodin);
  }

  async getBlockedPowerups(tokenCompartido: string) {
    return this.roomStateCache.getBlockedComodines(tokenCompartido);
  }

  async getChatMessages(tokenCompartido: string) {
    return this.chatCache.getMessages(tokenCompartido);
  }

  async getActiveHelper(tokenCompartido: string) {
    return this.helperCache.getActiveHelper(tokenCompartido);
  }

  // ─── Consensus helpers ──────────────────────────────────────────────────────

  /**
   * Obtiene los estudiantes online de una sala e inicializa el SET de
   * requeridos para el consenso de una pregunta.
   */
  async initConsensusRequired(
    token: string,
    preguntaId: number,
  ): Promise<void> {
    const nicknames = await this.participantsCache.getOnlineParticipants(token);
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      token,
      nicknames,
    );
    const students = participantesDb
      .filter((p: any) => p.rol === 'estudiante')
      .map((p: any) => p.nombre as string);

    await this.consensusCache.initializeRequired(token, preguntaId, students);
  }
}
