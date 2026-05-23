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

  
  // CICLO DE VIDA DE LOS EVENTOS 
  @SubscribeMessage('sala_creada')
  handleSalaCreada(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; configuracion: any }
  ) {
    // El profesor crea la sala y emitimos la confirmación
    this.server.to(payload.pin).emit('sala_creada', payload);
  }

  @SubscribeMessage('pregunta_liberada')
  handlePreguntaLiberada(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; pregunta: any }
  ) {
    // Se envía la nueva pregunta a todos los celulares conectados a ese PIN
    this.server.to(payload.pin).emit('pregunta_liberada', payload.pregunta);
  }

  @SubscribeMessage('temporizador_actualizado')
  handleTemporizador(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; tiempoRestante: number }
  ) {
    // Sincroniza el reloj en todas las pantallas de la sala
    this.server.to(payload.pin).emit('temporizador_actualizado', payload.tiempoRestante);
  }

  @SubscribeMessage('voto_recibido')
  handleVotoRecibido(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; userId: string; respuestaId: string }
  ) {
    // Un alumno vota. Se puede notificar al proyector (profesor) que alguien ya respondió
    this.server.to(payload.pin).emit('voto_recibido', { userId: payload.userId });
  }

  @SubscribeMessage('comodin_bloqueado')
  handleComodinBloqueado(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pin: string; userId: string; tipoComodin: string }
  ) {
    // Alguien usa un ataque/comodín y afecta a los demás en la sala
    this.server.to(payload.pin).emit('comodin_bloqueado', payload);
  }
} 