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
import { WebsocketsService } from '../../juego/websockets/websockets.service';
import * as ProcessVote from '../../juego/websockets/use-cases/process-audience-vote.use-case';
import * as SubmitAnswer from '../../juego/websockets/use-cases/submit-answer.use-case';
import { SalasService } from '../../juego/salas/salas.service';
import { RoomStateCacheUseCase } from '../cache/use-cases/room-state-cache.use-case';
import { ParticipantsCacheUseCase } from '../cache/use-cases/participants-cache.use-case';
import { ChatCacheUseCase } from '../cache/use-cases/chat-cache.use-case';
import { HelperCacheUseCase } from '../cache/use-cases/helper-cache.use-case';

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
    { distribucion: any; timer: NodeJS.Timeout }
  >();

  private scheduleBroadcast(tokenCompartido: string, distribucion: any): void {
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
      this.server.to(tokenCompartido).emit('voto_recibido', pending.distribucion);
      this.pendingBroadcasts.delete(tokenCompartido);
    }
  }

  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly salasService: SalasService,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly participantsCache: ParticipantsCacheUseCase,
    private readonly chatCache: ChatCacheUseCase,
    private readonly helperCache: HelperCacheUseCase,
  ) {}

  // ─── Bug 3: IA broadcast to all participants via EventEmitter ───────
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

  // ─── Bug 3: Público vote broadcast to all participants via EventEmitter ───────
  @OnEvent('publico.voto.recibido')
  handlePublicoVoteBroadcast(payload: {
    tokenCompartido: string;
    resultado: any;
  }) {
    this.server
      .to(payload.tokenCompartido)
      .emit('voto_recibido', payload.resultado);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketMap.get(client.id);
    if (info) {
      const result = await this.websocketsService.handleDisconnect({
        ...info,
        socketId: client.id,
      });
      this.socketMap.delete(client.id);

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
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    const info = await this.websocketsService.joinRoom({
      ...payload,
      socketId: client.id,
    });

    void client.join(info.tokenCompartido);
    this.socketMap.set(client.id, {
      tokenCompartido: info.tokenCompartido,
      nickname: info.nickname,
    });

    // Si el participante se reconecta con rol 'estudiante' pero ya no hay cupo,
    // se le reasigna como 'observador' automáticamente
    const onlineNicknames = info.participants;
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      info.tokenCompartido,
      onlineNicknames,
    );
    const yo = participantesDb.find((p: any) => p.nombre === info.nickname);
    if (yo?.rol === 'estudiante') {
      const sala = await this.salasService.obtenerPorId(info.tokenCompartido);
      if (sala) {
        const onlineStudents = participantesDb.filter(
          (p: any) => p.rol === 'estudiante' && p.nombre !== info.nickname,
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
          // Refrescar lista tras el cambio
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

    const bloqueados = await this.roomStateCache.getBlockedComodines(
      info.tokenCompartido,
    );
    client.emit('comodines_bloqueados', bloqueados);

    // Enviar historial de chat al usuario que se une
    const mensajesChat = await this.chatCache.getMessages(info.tokenCompartido);
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
      // Obtener online nicknames ANTES de validar el límite
      const onlineNicknames =
        await this.participantsCache.getOnlineParticipants(
          payload.tokenCompartido,
        );

      // Validar límite solo contra estudiantes ONLINE
      await this.salasService.updateParticipantRole(
        payload.tokenCompartido,
        payload.nickname,
        payload.nuevoRol,
        onlineNicknames,
      );

      // Refrescar lista después del cambio
      const participantesDb = await this.salasService.getParticipantsWithRoles(
        payload.tokenCompartido,
        onlineNicknames,
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
    @MessageBody() payload: ProcessVote.VotePayload,
  ) {
    try {
      const result = await this.websocketsService.processVote(payload);

      if (!result.success) {
        return result;
      }

      this.scheduleBroadcast(result.data!.tokenCompartido, result.distribucion);

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
    @MessageBody() payload: SubmitAnswer.AnswerPayload,
  ) {
    try {
      const result = await this.websocketsService.submitAnswer(payload);

      // Notificar a la sala que la pregunta fue respondida
      this.server.to(payload.tokenCompartido).emit('pregunta_respondida', {
        preguntaId: payload.preguntaId,
        opcionId: payload.opcionId,
        esCorrecta: result.esCorrecta,
        feedback: result.feedback,
      });

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
      const result = await this.websocketsService.toggleRoomEnabled(
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

      // Notificar a la sala antigua que el token cambió
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
    @MessageBody() payload: { tokenCompartido: string; rondaActiva: any },
  ) {
    this.logger.log(
      `[WS:REINICIAR_RONDA] Recibido para token=${payload.tokenCompartido}`,
    );
    try {
      await this.roomStateCache.clearRoundState(payload.tokenCompartido);
      this.logger.log(`[WS:REINICIAR_RONDA] Redis limpiado`);

      this.server.to(payload.tokenCompartido).emit('ronda_reiniciada', {
        rondaActiva: payload.rondaActiva,
      });
      this.logger.log(
        `[WS:REINICIAR_RONDA] Broadcast ronda_reiniciada emitido a sala ${payload.tokenCompartido}`,
      );

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
      const mensajes = await this.websocketsService.sendMessage({
        tokenCompartido: info.tokenCompartido,
        nickname: info.nickname,
        texto: payload.texto,
        tipo: payload.tipo,
      });

      // Emitir solo el mensaje nuevo (no todo el historial)
      const nuevoMensaje = mensajes[mensajes.length - 1];
      if (nuevoMensaje) {
        this.server
          .to(info.tokenCompartido)
          .emit('mensaje_chat_nuevo', nuevoMensaje);
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Error en Gateway al enviar mensaje:`, error);
      return { success: false, message: 'Error al enviar mensaje.' };
    }
  }

  // REENVÍO DE EVENTOS DE CICLO DE VIDA (Relays)

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
      // Flush votos pendientes de la pregunta anterior antes de liberar la nueva
      this.flushBroadcast(payload.tokenCompartido);

      // 1. Guardar en Redis y validar si se puede liberar
      await this.websocketsService.releaseQuestion(
        payload.tokenCompartido,
        payload.pregunta,
      );

      // 2. Emitir a la sala
      this.server
        .to(payload.tokenCompartido)
        .emit('pregunta_liberada', payload.pregunta);

      return { success: true };
    } catch (error: any) {
      this.logger.warn(`Bloqueo de liberación: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @SubscribeMessage('temporizador_actualizado')
  handleTemporizador(
    @MessageBody() payload: { tokenCompartido: string; tiempoRestante: number },
  ) {
    this.server
      .to(payload.tokenCompartido)
      .emit('temporizador_actualizado', payload.tiempoRestante);
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
    await this.roomStateCache.addBlockedComodin(
      payload.tokenCompartido,
      payload.tipoComodin,
    );
    this.server.to(payload.tokenCompartido).emit('comodin_bloqueado', payload);

    // Al activar el comodín del público, emitir distribución inicial (zeros)
    // para que los observadores puedan votar (puedeInteractuar checks votosPublico !== null)
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
    const result = await this.websocketsService.activateCallJoker(
      payload.tokenCompartido,
    );

    if (!result.success) {
      client.emit('comodin_llamada_error', { message: result.message });
      return;
    }

    const consultorSocketId = this.findSocketId(
      result.consultor.nickname,
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
      nicknameConsultor: result.consultor.nickname,
    });
  }

  @SubscribeMessage('enviar_pista_consultor')
  async handleEnviarPistaConsultor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { tokenCompartido: string; preguntaId: number; pista: string },
  ) {
    const helperNickname = await this.helperCache.getActiveHelper(
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

    const result = await this.websocketsService.sendHint(payload);

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
}
