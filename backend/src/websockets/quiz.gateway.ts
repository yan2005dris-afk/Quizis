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
          where: { tokenCompartido: token },
        });
        if (sala) {
          await this.prismaService.extendedClient.participantes.update({
            where: {
              salaId_nickname: {
                salaId: sala.salaId,
                nickname: nickname,
              },
            },
            data: { isOnline: false },
          });
          this.server.to(token).emit('participante_desconectado', nickname);
        }
      } catch (dbError) {
        console.error(
          'Error actualizando participante al desconectarse:',
          dbError,
        );
      }
    }
  }

  @SubscribeMessage('unirse_sala')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    client.join(payload.tokenCompartido);
    console.log(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido}`,
    );

    await this.cacheService.saveSocketSession(
      payload.tokenCompartido,
      payload.nombre,
      client.id,
    );

    try {
      const sala = await this.prismaService.extendedClient.salas.findUnique({
        where: { tokenCompartido: payload.tokenCompartido },
      });
      if (sala) {
        await this.prismaService.extendedClient.participantes.upsert({
          where: {
            salaId_nickname: {
              salaId: sala.salaId,
              nickname: payload.nombre,
            },
          },
          update: { isOnline: true },
          create: {
            salaId: sala.salaId,
            nickname: payload.nombre,
            rol: 'observador',
            isOnline: true,
          },
        });
      }
    } catch (dbError) {
      console.error('Error actualizando participante al unirse:', dbError);
    }

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

  @SubscribeMessage('activar_comodin_llamada')
  async handleActivarComodinLlamada(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; pregunta: any },
  ) {
    const { tokenCompartido, pregunta } = payload;
    console.log(`Solicitud de comodín llamada en sala: ${tokenCompartido}`);

    const consultor = await this.seleccionarConsultorAleatorio(tokenCompartido);
    if (!consultor) {
      console.warn(`No se encontraron compañeros observadores en línea en sala: ${tokenCompartido}`);
      client.emit('comodin_llamada_error', { message: 'No hay compañeros en línea disponibles.' });
      return;
    }

    const consultorSocketId = await this.cacheService.getSocketId(tokenCompartido, consultor.nickname);
    if (!consultorSocketId) {
      console.warn(`No se encontró socketId en caché para el consultor: ${consultor.nickname}`);
      client.emit('comodin_llamada_error', { message: 'El compañero seleccionado se desconectó.' });
      return;
    }

    await this.cacheService.saveActiveHelper(tokenCompartido, consultor.nickname);

    this.server.to(consultorSocketId).emit('consultor_seleccionado', {
      tokenCompartido,
      pregunta,
    });

    this.server.to(tokenCompartido).emit('comodin_llamada_iniciado', {
      nicknameConsultor: consultor.nickname,
    });

    console.log(`Comodín llamada iniciado. Consultor: ${consultor.nickname} (${consultorSocketId})`);
  }

  /**
   * Busca entre los clientes a ver quien tiene el rol de "estudiante", es decir el que esta jugando en ese momento
   * @param tokenCompartido
   * @returns
   */
  private async getRondaActivaConEstudiante(tokenCompartido: string) {
    return this.prismaService.extendedClient.rondas.findFirst({
      where: {
        sala: { tokenCompartido },
        estado: 'jugando',
      },
      include: {
        participante: true,
      },
    });
  }
  /**
   * Busca entre los clientes a ver quienes pueden ser consultores, es decir, quienes tengan el rol de "observador", no son el estudiante y estan en linea
   * @param salaId
   * @param estudianteNickname
   * @returns
   */
  private async getConsultoresCandidatos(
    salaId: number,
    estudianteNickname: string,
  ) {
    return this.prismaService.extendedClient.participantes.findMany({
      where: {
        salaId,
        isOnline: true,
        rol: 'observador',
        nickname: {
          not: estudianteNickname,
        },
      },
    });
  }

  /**
   * Devuelve un elemento aleatorio del array
   * @param array Array del cual se seleccionara un elemento
   * @returns Elemento aleatorio del array o null si el array esta vacio
   */
  private selectRandomElement<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }

  /**
   * Selecciona un consultor aleatorio entre los clientes conectados
   * @param tokenCompartido Token de la sala
   * @returns Consultor seleccionado o null si no se encontro ninguno
   */
  private async seleccionarConsultorAleatorio(tokenCompartido: string) {
    const rondaActiva = await this.getRondaActivaConEstudiante(tokenCompartido);
    if (!rondaActiva) {
      console.warn(
        `No hay ronda activa jugando en la sala con token: ${tokenCompartido}`,
      );
      return null;
    }

    const candidatos = await this.getConsultoresCandidatos(
      rondaActiva.salaId,
      rondaActiva.participante.nickname,
    );

    return this.selectRandomElement(candidatos);
  }
}
