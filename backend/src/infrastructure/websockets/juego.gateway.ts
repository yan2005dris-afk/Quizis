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
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketMap.get(client.id);
    if (info) {
      await this.websocketsService.handleDisconnect({
        ...info,
        socketId: client.id,
      });
      this.socketMap.delete(client.id);
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
    this.socketMap.set(client.id, info);

    this.server
      .to(info.tokenCompartido)
      .emit('nuevo_participante', info.nickname);
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

      this.server.to(result.data!.tokenCompartido).emit('voto_recibido', {
        participanteId: result.data!.participanteId,
      });

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
  handleComodinBloqueado(
    @MessageBody()
    payload: {
      tokenCompartido: string;
      userId: string;
      tipoComodin: string;
    },
  ) {
    this.server.to(payload.tokenCompartido).emit('comodin_bloqueado', payload);
  }
}
