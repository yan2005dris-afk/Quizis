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
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ComodinLlamadaService } from '../comodines/comodin-llamada/comodin-llamada.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly comodinLlamadaService: ComodinLlamadaService,
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
    await client.join(payload.tokenCompartido);
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

  @SubscribeMessage('activar_comodin_llamada')
  async handleActivarComodinLlamada(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; pregunta: any },
  ) {
    const { tokenCompartido, pregunta } = payload;
    console.log(`Solicitud de comodín llamada en sala: ${tokenCompartido}`);

    //---------------
    // aqui se utiliza la seleccion aleatoria del servicio de comodines
    //---------------

    const consultor =
      await this.comodinLlamadaService.seleccionarConsultorAleatorio(
        tokenCompartido,
      );
    if (!consultor) {
      console.warn(
        `No se encontraron compañeros observadores en línea en sala: ${tokenCompartido}`,
      );
      client.emit('comodin_llamada_error', {
        message: 'No hay compañeros en línea disponibles.',
      });
      return;
    }

    const consultorSocketId = await this.cacheService.getSocketId(
      tokenCompartido,
      consultor.nickname,
    );
    if (!consultorSocketId) {
      console.warn(
        `No se encontró socketId en caché para el consultor: ${consultor.nickname}`,
      );
      client.emit('comodin_llamada_error', {
        message: 'El compañero seleccionado se desconectó.',
      });
      return;
    }

    await this.cacheService.saveActiveHelper(
      tokenCompartido,
      consultor.nickname,
    );

    this.server.to(consultorSocketId).emit('consultor_seleccionado', {
      tokenCompartido,
      pregunta,
    });

    this.server.to(tokenCompartido).emit('comodin_llamada_iniciado', {
      nicknameConsultor: consultor.nickname,
    });

    console.log(
      `Comodín llamada iniciado. Consultor: ${consultor.nickname} (${consultorSocketId})`,
    );
  }

  @SubscribeMessage('enviar_pista_consultor')
  async handleEnviarPistaConsultor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      tokenCompartido: string;
      preguntaId: number;
      pista: string;
    },
  ) {
    const { tokenCompartido, preguntaId, pista } = payload;
    console.log(`Pista recibida del consultor en sala: ${tokenCompartido}`);

    const activeHelperNickname = await this.cacheService.getActiveHelper(tokenCompartido);
    if (!activeHelperNickname) {
      client.emit('enviar_pista_error', { message: 'No hay ninguna llamada activa en esta sala.' });
      return;
    }

    const expectedSocketId = await this.cacheService.getSocketId(tokenCompartido, activeHelperNickname);
    if (client.id !== expectedSocketId) {
      client.emit('enviar_pista_error', { message: 'No eres el consultor asignado para esta llamada.' });
      return;
    }

    const rondaActiva = await this.comodinLlamadaService.getRondaActivaConEstudiante(tokenCompartido);
    if (!rondaActiva) {
      client.emit('enviar_pista_error', { message: 'No hay una ronda activa en esta sala.' });
      return;
    }

    this.server.to(tokenCompartido).emit('pista_consultor_recibida', {
      pista,
      consultor: activeHelperNickname,
    });

    try {
      const existingAnswer = await this.prismaService.extendedClient.respuestasRonda.findFirst({
        where: {
          rondaId: rondaActiva.rondaId,
          preguntaId: preguntaId,
        },
      });

      if (existingAnswer) {
        await this.prismaService.extendedClient.respuestasRonda.update({
          where: { respuestaId: existingAnswer.respuestaId },
          data: { comodinUsado: 'LLAMADA' },
        });
      } else {
        await this.prismaService.extendedClient.respuestasRonda.create({
          data: {
            rondaId: rondaActiva.rondaId,
            preguntaId: preguntaId,
            comodinUsado: 'LLAMADA',
            esCorrecta: false,
          },
        });
      }
    } catch (dbError) {
      console.error('Error al persistir el uso del comodín LLAMADA:', dbError);
    }

    this.server.to(tokenCompartido).emit('comodin_usado', {
      tipoComodin: 'LLAMADA',
    });

    await this.cacheService.removeActiveHelper(tokenCompartido);

    console.log(`Pista transmitida con éxito y comodín LLAMADA registrado como usado.`);
  }
}
