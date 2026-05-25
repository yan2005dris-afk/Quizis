import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CacheService } from '../infrastructure/cache/cache.service';

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
    console.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = this.socketMap.get(client.id);
    if (info) {
      await this.cacheService.removeParticipantOnline(
        info.tokenCompartido,
        info.nickname,
      );
      this.socketMap.delete(client.id);
    }
  }

  @SubscribeMessage('unirse_sala')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    await client.join(payload.tokenCompartido);

    // Trackear online en Redis
    this.socketMap.set(client.id, {
  tokenCompartido: payload.tokenCompartido,
  nickname: payload.nombre,
  });
  await this.cacheService.setParticipantOnline(
    payload.tokenCompartido,
    payload.nombre,
  );

    console.log(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido}`,
    );

    // Sincronización de estado inicial para el que se une tarde
    const activeQuestion = await this.cacheService.getActiveQuestion(
      payload.tokenCompartido,
    );
    if (activeQuestion) {
      client.emit('pregunta_liberada', activeQuestion);
    }

    const rondaInfo = await this.cacheService.getRondaInfo(
      payload.tokenCompartido,
    );
    if (rondaInfo) {
      client.emit('info_ronda', rondaInfo);
    }

    this.server
      .to(payload.tokenCompartido)
      .emit('nuevo_participante', payload.nombre);
  }

  // CICLO DE VIDA DE LOS EVENTOS DEL JUEGO

  @SubscribeMessage('info_ronda')
  async handleInfoRonda(
    @MessageBody() payload: { tokenCompartido: string; info: any },
  ) {
    await this.cacheService.setRondaInfo(payload.tokenCompartido, payload.info);
    this.server.to(payload.tokenCompartido).emit('info_ronda', payload.info);
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
    // Guardar en caché para futuros observadores que entren tarde
    await this.cacheService.setActiveQuestion(
      payload.tokenCompartido,
      payload.pregunta,
    );

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
