import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /**
   * Mapeo socket.id -> { tokenCompartido, nickname }
   * Para saber quién se desconecta cuando se cierra el socket.
   */
  private readonly socketMap = new Map<
    string,
    { tokenCompartido: string; nickname: string }
  >();

  constructor(private readonly cacheService: CacheService) {}

  handleConnection(client: Socket) {
    console.error(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketMap.get(client.id);
    if (info) {
      await this.cacheService.removeParticipantOnline(
        info.tokenCompartido,
        info.nickname,
      );
      this.socketMap.delete(client.id);
      console.error(`${info.nickname} salió de la sala ${info.tokenCompartido}`);
    } else {
      console.error(`Cliente desconectado: ${client.id}`);
    }
  }

  @SubscribeMessage('unirse_sala')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    client.join(payload.tokenCompartido);
    // Guardar mapeo socket.id -> participante
    this.socketMap.set(client.id, {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
    });
    // Agregar a participantes online
    await this.cacheService.addParticipantOnline(
      payload.tokenCompartido,
      payload.nombre,
    );
    console.error(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido}`,
    );
    this.server
      .to(payload.tokenCompartido)
      .emit('nuevo_participante', payload.nombre);
  }

  // CICLO DE VIDA DE LOS EVENTOS DEL JUEGO

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

  @SubscribeMessage('voto_recibido')
  handleVotoRecibido(
    @MessageBody()
    payload: {
      tokenCompartido: string;
      userId: string;
      respuestaId: string;
    },
  ) {
    this.server
      .to(payload.tokenCompartido)
      .emit('voto_recibido', { userId: payload.userId });
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