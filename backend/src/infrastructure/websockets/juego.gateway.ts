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
import { Server, Socket } from 'socket.io';
import { WebsocketsService } from '../../juego/websockets/websockets.service';
import * as ProcessVote from '../../juego/websockets/use-cases/process-audience-vote.use-case';
import * as SubmitAnswer from '../../juego/websockets/use-cases/submit-answer.use-case';
import { SalasService } from '../../juego/salas/salas.service';
import { RoomStateCacheUseCase } from '../cache/use-cases/room-state-cache.use-case';
import { ParticipantsCacheUseCase } from '../cache/use-cases/participants-cache.use-case';

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

  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly salasService: SalasService,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly participantsCache: ParticipantsCacheUseCase,
  ) {}

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

    client.join(info.tokenCompartido);
    this.socketMap.set(client.id, {
      tokenCompartido: info.tokenCompartido,
      nickname: info.nickname,
    });

    const participantesDb = await this.salasService.getParticipantsWithRoles(
      info.tokenCompartido,
      info.participants,
    );
    this.server.to(info.tokenCompartido).emit('participantes', participantesDb);

    const bloqueados = await this.roomStateCache.getBlockedComodines(
      info.tokenCompartido,
    );
    client.emit('comodines_bloqueados', bloqueados);
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
      await this.salasService.updateParticipantRole(
        payload.tokenCompartido,
        payload.nickname,
        payload.nuevoRol,
      );

      const onlineNicknames =
        await this.participantsCache.getOnlineParticipants(
          payload.tokenCompartido,
        );
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
      return { success: false, message: 'Error al cambiar rol' };
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

      this.server
        .to(result.data!.tokenCompartido)
        .emit('voto_recibido', result.distribucion);

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
    } catch (error) {
      return { success: false, message: 'No se pudo regenerar el token.' };
    }
  }

  @SubscribeMessage('finalizar_partida')
  async handleFinalizeGame(
    @MessageBody() payload: { salaId: number; tokenCompartido: string },
  ) {
    try {
      const res = await this.salasService.finalizarSala(payload.salaId);

      this.server.to(payload.tokenCompartido).emit('partida_finalizada', {
        totalParticipantes: res.totalParticipantes,
      });

      return res;
    } catch (error) {
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
  }
}
