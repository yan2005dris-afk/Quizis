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
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';


@WebSocketGateway({ cors: { origin: '*' } })
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    const session = await this.cacheService.removeSocketSession(client.id);
    if (session) {
      const { token, nickname } = session;
      console.log(`Participante ${nickname} se desconectó de la sala ${token}`);
      try {
        const sala = await this.prismaService.extendedClient.salas.findUnique({
          where: { tokenCompartido: token }
        });
        if (sala) {
          await this.prismaService.extendedClient.participantes.update({
            where: {
              salaId_nickname: {
                salaId: sala.salaId,
                nickname: nickname
              }
            },
            data: { isOnline: false }
          });
          this.server.to(token).emit('participante_desconectado', nickname);
        }
      } catch (dbError) {
        console.error('Error actualizando participante al desconectarse:', dbError);
      }
    }
  }

  @SubscribeMessage('unirse_sala')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string }
  ) {
    client.join(payload.tokenCompartido);
    console.log(`${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido}`);
    
    await this.cacheService.saveSocketSession(
      payload.tokenCompartido,
      payload.nombre,
      client.id
    );

    try {
      const sala = await this.prismaService.extendedClient.salas.findUnique({
        where: { tokenCompartido: payload.tokenCompartido }
      });
      if (sala) {
        await this.prismaService.extendedClient.participantes.upsert({
          where: {
            salaId_nickname: {
              salaId: sala.salaId,
              nickname: payload.nombre
            }
          },
          update: { isOnline: true },
          create: {
            salaId: sala.salaId,
            nickname: payload.nombre,
            rol: 'observador',
            isOnline: true
          }
        });
      }
    } catch (dbError) {
      console.error('Error actualizando participante al unirse:', dbError);
    }

    this.server.to(payload.tokenCompartido).emit('nuevo_participante', payload.nombre);
  }


  // CICLO DE VIDA DE LOS EVENTOS DEL JUEGO
  

  @SubscribeMessage('sala_creada')
  handleSalaCreada(
    @MessageBody() payload: { tokenCompartido: string; configuracion: any }
  ) {
    this.server.to(payload.tokenCompartido).emit('sala_creada', payload);
  }

  @SubscribeMessage('pregunta_liberada')
  handlePreguntaLiberada(
    @MessageBody() payload: { tokenCompartido: string; pregunta: any }
  ) {
    this.server.to(payload.tokenCompartido).emit('pregunta_liberada', payload.pregunta);
  }

  @SubscribeMessage('temporizador_actualizado')
  handleTemporizador(
    @MessageBody() payload: { tokenCompartido: string; tiempoRestante: number }
  ) {
    this.server.to(payload.tokenCompartido).emit('temporizador_actualizado', payload.tiempoRestante);
  }

  @SubscribeMessage('voto_recibido')
  handleVotoRecibido(
    @MessageBody() payload: { tokenCompartido: string; userId: string; respuestaId: string }
  ) {
    this.server.to(payload.tokenCompartido).emit('voto_recibido', { userId: payload.userId });
  }

  @SubscribeMessage('comodin_bloqueado')
  handleComodinBloqueado(
    @MessageBody() payload: { tokenCompartido: string; userId: string; tipoComodin: string }
  ) {
    this.server.to(payload.tokenCompartido).emit('comodin_bloqueado', payload);
  }
}