import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

// Domain Services
import { SalasService } from '../../juego/salas/salas.service';
import { VotosService } from '../../juego/votos/votos.service';
import { ChatService } from '../../juego/chat/chat.service';
import { ComodinesService } from '../../juego/comodines/comodines.service';

// WebSocket Use Cases
import { HandleJoinRoomWebsocket } from '../../juego/salas/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from '../../juego/salas/websockets/handle-disconnect.websocket';
import { ToggleRoomEnabledWebsocket } from '../../juego/salas/websockets/toggle-room-enabled.websocket';
import { ProcessAudienceVoteWebsocket } from '../../juego/votos/websockets/process-audience-vote.websocket';
import { SubmitAnswerWebsocket } from '../../juego/votos/websockets/submit-answer.websocket';
import { ReleaseQuestionWebsocket } from '../../juego/rondas/websockets/release-question.websocket';
import { ActivateCallJokerWebsocket } from '../../juego/comodines/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../juego/comodines/websockets/send-hint.websocket';

// Infrastructure / Common
import {
  GameEvents,
} from '../common/events/game-events.types';
import type { ConsensusEvaluatedEvent } from '../common/events/game-events.types';
import type { VotePayload } from '../../juego/votos/websockets/process-audience-vote.websocket';
import type { AnswerPayload } from '../../juego/votos/websockets/submit-answer.websocket';

type ParticipantInfo = { id: string; nombre: string; puntaje: number; rol: string };
type VoteDistribution = { total: number; [letra: string]: number };
type ConsensusInput = {
  type?: string;
  status?: string;
  votosRecibidos?: number;
  totalRequeridos?: number;
  winningOpcionId?: number;
  esCorrecta?: boolean | null;
  feedback?: string | null;
};

@WebSocketGateway({ cors: { origin: '*' } })
export class JuegoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(JuegoGateway.name);

  /**
   * Mapeo socket.id -> { tokenCompartido, nickname }
   */
  private readonly socketMap = new Map<
    string,
    { tokenCompartido: string; nickname: string }
  >();

  /**
   * Debounce de broadcast: acumula distribución y emite cada 500ms por sala
   */
  private readonly pendingBroadcasts = new Map<
    string,
    { distribucion: VoteDistribution; timer: NodeJS.Timeout }
  >();

  private readonly timersActivos = new Map<string, NodeJS.Timeout>();

  private scheduleBroadcast(tokenCompartido: string, distribucion: VoteDistribution): void {
    const existing = this.pendingBroadcasts.get(tokenCompartido);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.server.to(tokenCompartido).emit('voto_recibido', distribucion);
      this.pendingBroadcasts.delete(tokenCompartido);
    }, 500);

    this.pendingBroadcasts.set(tokenCompartido, { distribucion, timer });
  }

  private flushBroadcast(tokenCompartido: string): void {
    const pending = this.pendingBroadcasts.get(tokenCompartido);
    if (pending) {
      clearTimeout(pending.timer);
      this.server
        .to(tokenCompartido)
        .emit('voto_recibido', pending.distribucion);
      this.pendingBroadcasts.delete(tokenCompartido);
    }
  }

  constructor(
    private readonly salasService: SalasService,
    private readonly votosService: VotosService,
    private readonly chatService: ChatService,
    private readonly comodinesService: ComodinesService,
    private readonly handleJoinRoom: HandleJoinRoomWebsocket,
    private readonly handleDisconnectWebsocket: HandleDisconnectWebsocket,
    private readonly toggleRoomEnabledWebsocket: ToggleRoomEnabledWebsocket,
    private readonly processAudienceVote: ProcessAudienceVoteWebsocket,
    private readonly submitAnswerWebsocket: SubmitAnswerWebsocket,
    private readonly releaseQuestionWebsocket: ReleaseQuestionWebsocket,
    private readonly activateCallJokerWebsocket: ActivateCallJokerWebsocket,
    private readonly sendHintWebsocket: SendHintWebsocket,
  ) {}

  // ─── Events Listeners ──────────────────────────────────────────────────────

  @OnEvent('comodin.ia.suggestion')
  handleIaSuggestionBroadcast(payload: {
    preguntaId: number;
    literal: string;
    explicacion: string;
    tokenCompartido: string;
  }) {
    this.server.to(payload.tokenCompartido).emit('ia_sugerencia_recibida', {
      preguntaId: payload.preguntaId,
      literal: payload.literal,
      explicacion: payload.explicacion,
    });
  }

  @OnEvent(GameEvents.VOTOS.VOTO_PUBLICO_RECIBIDO)
  handlePublicoVoteBroadcast(payload: {
    tokenCompartido: string;
    resultado: any;
  }) {
    this.server
      .to(payload.tokenCompartido)
      .emit('voto_recibido', payload.resultado);
  }

  @OnEvent(GameEvents.VOTOS.CONSENSO_EVALUADO)
  handleConsensusEvaluated(event: ConsensusEvaluatedEvent) {
    this.emitConsensusResult(
      event.tokenCompartido,
      event.preguntaId,
      event.result,
    );
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketMap.get(client.id);
    if (info) {
      const result = await this.handleDisconnectWebsocket.execute({
        ...info,
        socketId: client.id,
      });
      this.socketMap.delete(client.id);

      // Detener timer si la sala quedó vacía
      const remainingInRoom = [...this.socketMap.values()].filter(
        (v) => v.tokenCompartido === info.tokenCompartido,
      ).length;
      if (remainingInRoom === 0) {
        this.detenerTimer(info.tokenCompartido);
      }

      const participantesDb = await this.salasService.getParticipantsWithRoles(
        info.tokenCompartido,
        result.participants,
      );
      this.server
        .to(result.tokenCompartido)
        .emit('participantes', participantesDb);
    } else {
      this.logger.log(`Cliente desconectado sin registro previo: ${client.id}`);
    }
  }

  @SubscribeMessage('unirse_sala')
  async handleJoinRoomMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    const info = await this.handleJoinRoom.execute({
      ...payload,
      socketId: client.id,
    });

    void client.join(info.tokenCompartido);
    this.socketMap.set(client.id, {
      tokenCompartido: info.tokenCompartido,
      nickname: info.nickname,
    });

    const onlineNicknames = info.participants;
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      info.tokenCompartido,
      onlineNicknames,
    );
    const yo = participantesDb.find((p: ParticipantInfo) => p.nombre === info.nickname);
    if (yo?.rol === 'estudiante') {
      const sala = await this.salasService.obtenerPorId(info.tokenCompartido);
      if (sala) {
        const onlineStudents = participantesDb.filter(
          (p: ParticipantInfo) => p.rol === 'estudiante' && p.nombre !== info.nickname,
        ).length;
        if (onlineStudents >= sala.maxEstudiantes) {
          this.logger.log(
            `[JOIN] Cupo de estudiantes alcanzado. ${info.nickname} pasa a observador.`,
          );
          await this.salasService.updateParticipantRole(
            info.tokenCompartido,
            info.nickname,
            'observador',
            onlineNicknames,
          );
          const updatedList = await this.salasService.getParticipantsWithRoles(
            info.tokenCompartido,
            onlineNicknames,
          );
          this.server
            .to(info.tokenCompartido)
            .emit('participantes', updatedList);
          return;
        }
      }
    }

    this.server.to(info.tokenCompartido).emit('participantes', participantesDb);

    const bloqueados = await this.salasService.getBlockedComodines(
      info.tokenCompartido,
    );
    client.emit('comodines_bloqueados', bloqueados);

    const mensajesChat = await this.chatService.getChatMessages(
      info.tokenCompartido,
    );
    if (mensajesChat.length > 0) {
      client.emit('mensaje_chat', mensajesChat);
    }
  }

  @SubscribeMessage('cambiar_rol_participante')
  async handleCambiarRolParticipante(
    @MessageBody()
    payload: {
      tokenCompartido: string;
      nickname: string;
      nuevoRol: string;
    },
  ) {
    try {
      const participantesDb =
        await this.salasService.changeParticipantRole(
          payload.tokenCompartido,
          payload.nickname,
          payload.nuevoRol,
        );

      this.server
        .to(payload.tokenCompartido)
        .emit('participantes', participantesDb);

      return { success: true };
    } catch (e: any) {
      this.logger.error(`Error cambiando rol:`, e);
      return { success: false, message: e.message || 'Error al cambiar rol' };
    }
  }

  @SubscribeMessage('audience:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VotePayload,
  ) {
    try {
      const result = await this.processAudienceVote.execute(payload);

      if (!result.success) {
        return result;
      }

      this.scheduleBroadcast(result.data!.tokenCompartido, result.distribucion as VoteDistribution);

      return result;
    } catch (error) {
      this.logger.error(`Error en Gateway al procesar voto:`, error);
      return {
        success: false,
        message: 'Error interno del servidor. Intenta nuevamente.',
      };
    }
  }

  @SubscribeMessage('responder_pregunta')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerPayload,
  ) {
    try {
      const socketInfo = this.socketMap.get(client.id);
      const nickname = socketInfo?.nickname ?? payload.nickname ?? 'unknown';

      const result = await this.submitAnswerWebsocket.execute({
        ...payload,
        nickname,
      });

      const consensusInput: ConsensusInput = { type: result.status, ...result };
      this.emitConsensusResult(payload.tokenCompartido, payload.preguntaId, consensusInput);

      if (result.status === 'no-majority') {
        try {
          await this.votosService.initConsensusRequired(
            payload.tokenCompartido,
            payload.preguntaId,
          );
          this.logger.log(
            `[CONSENSUS:REVOTO] Required SET reinicializado para pregunta ${payload.preguntaId}`,
          );
        } catch (reinitError) {
          this.logger.error(
            `[CONSENSUS:REVOTO] Error reinicializando required SET: ${reinitError}`,
          );
        }
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error en Gateway al responder pregunta:`, error);
      return {
        success: false,
        message: error.message || 'Error interno al procesar respuesta.',
      };
    }
  }

  @SubscribeMessage('cambiar_estado_sala')
  async handleToggleRoom(
    @MessageBody() payload: { tokenCompartido: string; habilitada: boolean },
  ) {
    try {
      const result = await this.toggleRoomEnabledWebsocket.execute(
        payload.tokenCompartido,
        payload.habilitada,
      );

      this.server.to(payload.tokenCompartido).emit('sala_estado_cambiado', {
        habilitada: result.enabled,
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Error en Gateway al cambiar estado de sala:`, error);
      return {
        success: false,
        message: 'Error al cambiar el estado de la sala.',
      };
    }
  }

  @SubscribeMessage('regenerar_token')
  async handleRegenerateToken(
    @MessageBody() payload: { salaId: number; tokenAnterior: string },
  ) {
    try {
      const res = await this.salasService.regenerarToken(payload.salaId);

      this.server.to(payload.tokenAnterior).emit('token_sala_actualizado', {
        nuevoToken: res.tokenCompartido,
      });

      return res;
    } catch {
      return { success: false, message: 'No se pudo regenerar el token.' };
    }
  }

  @SubscribeMessage('finalizar_partida')
  async handleFinalizeGame(
    @MessageBody() payload: { salaId: number; tokenCompartido: string },
  ) {
    try {
      this.flushBroadcast(payload.tokenCompartido);
      const res = await this.salasService.finalizarSala(payload.salaId);

      this.server.to(payload.tokenCompartido).emit('partida_finalizada', {
        totalParticipantes: res.totalParticipantes,
      });

      return res;
    } catch {
      return { success: false, message: 'No se pudo finalizar la partida.' };
    }
  }

  @SubscribeMessage('reiniciar_ronda')
  async handleReiniciarRonda(
    @MessageBody() payload: { tokenCompartido: string; rondaActiva: unknown },
  ) {
    this.logger.log(
      `[WS:REINICIAR_RONDA] Recibido para token=${payload.tokenCompartido}`,
    );
    try {
      this.detenerTimer(payload.tokenCompartido);
      const sala = await this.salasService.obtenerPorId(payload.tokenCompartido);
      if (!sala) throw new Error('Sala no encontrada');
      await this.salasService.reiniciarRonda(sala.salaId);

      this.server.to(payload.tokenCompartido).emit('ronda_reiniciada', {
        rondaActiva: payload.rondaActiva,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`[WS:REINICIAR_RONDA] Error:`, error);
      return { success: false, message: 'No se pudo reiniciar la ronda.' };
    }
  }

  @SubscribeMessage('enviar_mensaje')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { texto: string; tipo: 'mensaje' | 'sugerencia' },
  ) {
    const info = this.socketMap.get(client.id);
    if (!info) {
      return { success: false, message: 'No estás conectado a una sala.' };
    }

    try {
      const mensajes = await this.chatService.sendMessage({
        tokenCompartido: info.tokenCompartido,
        nickname: info.nickname,
        texto: payload.texto,
        tipo: payload.tipo,
      });

      const nuevoMensaje = mensajes[mensajes.length - 1];
      if (nuevoMensaje) {
        this.server
          .to(info.tokenCompartido)
          .emit('mensaje_chat', [nuevoMensaje]);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error en Gateway al enviar mensaje:`, error);
      return { success: false, message: 'Error al enviar mensaje.' };
    }
  }

  @SubscribeMessage('sala_creada')
  handleSalaCreada(
    @MessageBody() payload: { tokenCompartido: string; configuracion: any },
  ) {
    this.server.to(payload.tokenCompartido).emit('sala_creada', payload);
  }

  @SubscribeMessage('pregunta_liberada')
  async handlePreguntaLiberada(
    @MessageBody() payload: { tokenCompartido: string; pregunta: any },
  ) {
    try {
      this.flushBroadcast(payload.tokenCompartido);

      await this.releaseQuestionWebsocket.execute(
        payload.tokenCompartido,
        payload.pregunta,
      );

      this.server
        .to(payload.tokenCompartido)
        .emit('pregunta_liberada', payload.pregunta);

      try {
        await this.votosService.initConsensusRequired(
          payload.tokenCompartido,
          payload.pregunta.preguntaId,
        );
        this.logger.log(
          `[CONSENSUS] Inicializado para pregunta ${payload.pregunta.preguntaId}`,
        );
      } catch (consensusError) {
        this.logger.error(
          `[CONSENSUS] Error inicializando required SET: ${consensusError}`,
        );
      }

      // 4. Iniciar timer server-authoritative
      try {
        const tiempoLimite = await this.salasService.getTiempoLimite(
          payload.tokenCompartido,
        );
        await this.iniciarTimer(payload.tokenCompartido, tiempoLimite);
      } catch (timerError) {
        this.logger.error(`[TIMER] Error iniciando timer: ${timerError}`);
      }

      return { success: true };
    } catch (error: any) {
      this.logger.warn(`Bloqueo de liberación: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @SubscribeMessage('comodin_bloqueado')
  async handleComodinBloqueado(
    @MessageBody()
    payload: {
      tokenCompartido: string;
      userId: string;
      tipoComodin: string;
    },
  ) {
    await this.salasService.addBlockedComodin(
      payload.tokenCompartido,
      payload.tipoComodin,
    );
    this.server.to(payload.tokenCompartido).emit('comodin_bloqueado', payload);

    if (payload.tipoComodin === 'PUBLICO') {
      this.server
        .to(payload.tokenCompartido)
        .emit('voto_recibido', { A: 0, B: 0, C: 0, D: 0, total: 0 });
    }
  }

  @SubscribeMessage('activar_comodin_llamada')
  async handleActivarComodinLlamada(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; pregunta: any },
  ) {
    const result = await this.activateCallJokerWebsocket.execute(
      payload.tokenCompartido,
    );

    if (!result.success) {
      client.emit('comodin_llamada_error', { message: result.message });
      return;
    }

    const consultorNickname = result.consultor?.nickname;
    if (!consultorNickname) {
       client.emit('comodin_llamada_error', { message: 'No hay consultor disponible.' });
       return;
    }

    const consultorSocketId = this.findSocketId(
      consultorNickname,
      payload.tokenCompartido,
    );

    if (!consultorSocketId) {
      client.emit('comodin_llamada_error', {
        message: 'El compañero seleccionado se desconectó.',
      });
      return;
    }

    this.server.to(consultorSocketId).emit('consultor_seleccionado', {
      tokenCompartido: payload.tokenCompartido,
      pregunta: payload.pregunta,
    });

    this.server.to(payload.tokenCompartido).emit('comodin_llamada_iniciado', {
      nicknameConsultor: consultorNickname,
    });
  }

  @SubscribeMessage('enviar_pista_consultor')
  async handleEnviarPistaConsultor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { tokenCompartido: string; preguntaId: number; pista: string },
  ) {
    const helperNickname = await this.comodinesService.getActiveHelper(
      payload.tokenCompartido,
    );

    if (!helperNickname) {
      client.emit('enviar_pista_error', {
        message: 'No hay ninguna llamada activa en esta sala.',
      });
      return;
    }

    const expectedSocketId = this.findSocketId(
      helperNickname,
      payload.tokenCompartido,
    );

    if (client.id !== expectedSocketId) {
      client.emit('enviar_pista_error', {
        message: 'No eres el consultor asignado para esta llamada.',
      });
      return;
    }

    const result = await this.sendHintWebsocket.execute(payload);

    if (!result.success) {
      client.emit('enviar_pista_error', { message: result.message });
      return;
    }

    this.server.to(payload.tokenCompartido).emit('pista_consultor_recibida', {
      pista: result.pista,
      consultor: result.helperNickname,
    });

    this.server.to(payload.tokenCompartido).emit('comodin_usado', {
      tipoComodin: 'LLAMADA',
    });
  }

  private emitConsensusResult(
    token: string,
    preguntaId: number,
    result: ConsensusInput,
  ): void {
    const type = result.type ?? result.status;
    switch (type) {
      case 'pending':
        this.server.to(token).emit('voto_confirmado', {
          preguntaId,
          votosRecibidos: result.votosRecibidos,
          totalRequeridos: result.totalRequeridos,
        });
        break;

      case 'majority':
      case 'single':
        this.detenerTimer(token);
        this.server.to(token).emit('pregunta_respondida', {
          preguntaId,
          opcionId: result.winningOpcionId,
          esCorrecta: result.esCorrecta ?? null,
          feedback: result.feedback ?? null,
        });
        break;

      case 'no-majority':
        this.server.to(token).emit('revoto_solicitado', {
          preguntaId,
          motivo: 'sin_mayoria',
        });
        break;
    }
  }

  private findSocketId(
    nickname: string,
    tokenCompartido: string,
  ): string | undefined {
    for (const [socketId, info] of this.socketMap.entries()) {
      if (
        info.nickname === nickname &&
        info.tokenCompartido === tokenCompartido
      ) {
        return socketId;
      }
    }
    return undefined;
  }

  private async iniciarTimer(
    tokenCompartido: string,
    segundos: number,
  ): Promise<void> {
    this.detenerTimer(tokenCompartido);
    if (segundos <= 0) return;

    let remaining = segundos;
    this.server.to(tokenCompartido).emit('temporizador_actualizado', remaining);

    const tick = setInterval(() => {
      remaining -= 1;
      this.server
        .to(tokenCompartido)
        .emit('temporizador_actualizado', remaining);

      if (remaining <= 0) {
        this.detenerTimer(tokenCompartido);
        this.server
          .to(tokenCompartido)
          .emit('tiempo_agotado', { tokenCompartido });
        setTimeout(() => {
          this.server
            .to(tokenCompartido)
            .emit('transicion_pregunta', { segundos: 3 });
        }, 500);
        this.logger.log(`[TIMER] Tiempo agotado para sala ${tokenCompartido}`);
      }
    }, 1000);

    this.timersActivos.set(tokenCompartido, tick);
    this.logger.log(
      `[TIMER] Iniciado para sala ${tokenCompartido}: ${segundos}s`,
    );
  }

  private detenerTimer(tokenCompartido: string): void {
    const existing = this.timersActivos.get(tokenCompartido);
    if (existing) {
      clearInterval(existing);
      this.timersActivos.delete(tokenCompartido);
      this.logger.log(`[TIMER] Detenido para sala ${tokenCompartido}`);
    }
  }
}
