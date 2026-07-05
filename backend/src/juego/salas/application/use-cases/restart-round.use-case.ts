import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { ParticipantsCacheService } from '../../../shared/room-state/participants-cache.service';

@Injectable()
export class RestartRoundUseCase {
  private readonly logger = new Logger(RestartRoundUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly participantsCache: ParticipantsCacheService,
  ) {}

  async execute(salaId: number) {
    this.logger.log(
      `[RESTART] Iniciando reinicio de ronda para sala ${salaId}`,
    );

    const sala = await this.prisma.salas.findUnique({ where: { salaId } });
    if (!sala) throw new NotFoundException('Sala no encontrada');

    this.logger.log(
      `[RESTART] Sala encontrada: token=${sala.tokenCompartido}, banco=${sala.bancoId}`,
    );

    const currentRound = await this.prisma.rondas.findFirst({
      where: { salaId, estado: 'jugando' },
    });

    if (currentRound) {
      this.logger.log(
        `[RESTART] Cerrando ronda actual rondaId=${currentRound.rondaId}, numero=${currentRound.numeroRonda}`,
      );
      await this.prisma.rondas.update({
        where: { rondaId: currentRound.rondaId },
        data: { estado: 'completado', fechaFin: new Date() },
      });
    } else {
      this.logger.warn(
        `[RESTART] No se encontró ronda activa (estado=jugando) para sala ${salaId}`,
      );
    }

    let participante =
      (await this.prisma.participantes.findFirst({
        where: { salaId, deletedAt: null, rol: 'estudiante' },
      })) ??
      (await this.prisma.participantes.findFirst({
        where: { salaId, deletedAt: null },
      }));

    if (!participante) {
      const cachedNicknames =
        await this.participantsCache.getHistoricalParticipants(
          sala.tokenCompartido,
        );
      const nickname =
        cachedNicknames.find((n) => !n.startsWith('Host-')) ??
        cachedNicknames[0];
      if (nickname) {
        participante = await this.prisma.participantes.upsert({
          where: { salaId_nickname: { salaId, nickname } },
          update: {},
          create: { salaId, nickname, rol: 'observador' },
        });
        this.logger.log(
          `[RESTART] Participante creado desde cache: nickname=${nickname}`,
        );
      }
    }

    if (!participante) {
      this.logger.error(`[RESTART] No hay participantes en sala ${salaId}`);
      throw new BadRequestException('No hay participantes para crear la ronda');
    }

    this.logger.log(
      `[RESTART] Participante seleccionado: id=${participante.participanteId}, rol=${participante.rol}`,
    );

    const preguntas = await this.prisma.preguntas.findMany({
      where: { bancoId: sala.bancoId },
      take: sala.limitePreguntas,
      orderBy: { nivel: 'asc' },
      select: {
        preguntaId: true,
        texto: true,
        nivel: true,
        feedbackCorrecto: true,
        feedbackIncorrecto: true,
        opciones: {
          select: { opcionId: true, texto: true, esCorrecta: true },
        },
      },
    });

    if (preguntas.length === 0) {
      this.logger.error(`[RESTART] Banco ${sala.bancoId} no tiene preguntas`);
      throw new BadRequestException('No hay preguntas disponibles en el banco');
    }

    this.logger.log(
      `[RESTART] ${preguntas.length} preguntas cargadas del banco ${sala.bancoId}`,
    );

    const numeroRonda = currentRound ? currentRound.numeroRonda + 1 : 1;

    const newRound = await this.prisma.rondas.create({
      data: {
        salaId,
        participanteId: participante.participanteId,
        numeroRonda,
        estado: 'jugando',
        preguntasAsignadas: preguntas.map((p) => p.preguntaId),
        fechaInicio: new Date(),
      },
    });

    this.logger.log(
      `[RESTART] Nueva ronda creada: rondaId=${newRound.rondaId}, numero=${numeroRonda}`,
    );

    // Limpiar estado de ronda y retroceder estado a ESPERANDO_ALUMNOS en Redis
    await this.roomStateCache.clearRoundState(sala.tokenCompartido);
    this.logger.log(
      `[RESTART] Redis limpiado: active-question, status, comodines-bloqueados`,
    );

    await this.roomStateCache.setRoomEstado(
      sala.tokenCompartido,
      'ESPERANDO_ALUMNOS',
    );
    this.logger.log(`[RESTART] Estado Redis → ESPERANDO_ALUMNOS`);

    const historialPreguntas = preguntas.map((p) => ({
      preguntaId: p.preguntaId,
      texto: p.texto,
      nivel: p.nivel,
      feedbackCorrecto: p.feedbackCorrecto,
      feedbackIncorrecto: p.feedbackIncorrecto,
      opciones: p.opciones.map((o, i) => ({
        opcionId: o.opcionId,
        texto: o.texto,
        letra: String.fromCharCode(65 + i),
        esCorrecta: o.esCorrecta,
      })),
      respuestaDada: null,
    }));

    this.logger.log(
      `[RESTART] Reinicio completo. Retornando nueva rondaActiva rondaId=${newRound.rondaId}`,
    );

    return {
      estado: 'ESPERANDO_ALUMNOS' as const,
      rondaActiva: {
        rondaId: newRound.rondaId,
        numeroRonda: newRound.numeroRonda,
        estado: newRound.estado,
        fechaInicio: newRound.fechaInicio?.toISOString() ?? null,
        preguntaActualId: null,
        preguntaActual: null,
        historialPreguntas,
      },
    };
  }
}
