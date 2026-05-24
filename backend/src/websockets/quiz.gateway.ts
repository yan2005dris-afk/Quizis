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

@WebSocketGateway({ cors: { origin: '*' } })
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('unirse_sala')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    client.join(payload.tokenCompartido);
    console.log(
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
