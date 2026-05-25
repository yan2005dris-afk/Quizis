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

  constructor(private readonly websocketsService: WebsocketsService) {}

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

  // REENVÍO DE EVENTOS DE CICLO DE VIDA (Relays)

  @SubscribeMessage('sala_creada')
  handleSalaCreada(
    @MessageBody() payload: { tokenCompartido: string; configuracion: any },
  ) {
    this.server.to(payload.tokenCompartido).emit('sala_creada', payload);
  }

  @SubscribeMessage('pregunta_liberada')
  handlePreguntaLiberada(
    @MessageBody() payload: { tokenCompartido: string; pregunta: any },
  ) {
    this.server
      .to(payload.tokenCompartido)
      .emit('pregunta_liberada', payload.pregunta);
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
