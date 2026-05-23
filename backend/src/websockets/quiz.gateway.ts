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

// Configuramos el Gateway para que acepte conexiones de cualquier origen (CORS)
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
    @MessageBody() payload: { pin: string; nombre: string }
  ) {
    
    client.join(payload.pin);
    console.log(`${payload.nombre} se unió a la sala ${payload.pin}`);
    
    
    this.server.to(payload.pin).emit('nuevo_participante', payload.nombre);
  }

  
  @SubscribeMessage('lanzar_pregunta')
  handleLanzarPregunta(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; preguntaId: number }
  ) {
    
    this.server.to(payload.pin).emit('pregunta_liberada', payload.preguntaId);
  }

  @SubscribeMessage('enviar_voto')
  handleVotoRecibido(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; opcion: string }
  ) {
    
    this.server.to(payload.pin).emit('voto_recibido', payload.opcion);
  }

  
  notificarSalaCreada(pin: string) {
    this.server.emit('sala_creada', pin);
  }

  actualizarTemporizador(pin: string, tiempoRestante: number) {
    this.server.to(pin).emit('temporizador_actualizado', tiempoRestante);
  }

  bloquearComodin(pin: string, tipoComodin: string) {
    this.server.to(pin).emit('comodin_bloqueado', tipoComodin);
  }
}