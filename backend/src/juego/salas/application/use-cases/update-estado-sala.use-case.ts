import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { ParticipantsCacheService } from '../../../shared/room-state/participants-cache.service';
import {
  UpdateEstadoSalaDto,
  EstadoSala,
} from '../../interfaces/dto/update-estado-sala.dto';

@Injectable()
export class UpdateEstadoSalaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly participantsCache: ParticipantsCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    const sala = await this.prisma.salas.findUnique({ where: { salaId: id } });
    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    const nuevoEstado = updateEstadoSalaDto.estado;

    // Redis es la fuente de verdad del estado en tiempo real.
    // Fallback a Postgres si Redis no tiene el estado aún.
    const estadoActual =
      (await this.roomStateCache.getRoomEstado(sala.tokenCompartido)) ??
      (sala.estado as EstadoSala);

    const validTransitions: Record<EstadoSala, EstadoSala[]> = {
      [EstadoSala.BORRADOR]: [EstadoSala.ESPERANDO_ALUMNOS],
      [EstadoSala.ESPERANDO_ALUMNOS]: [EstadoSala.BORRADOR, EstadoSala.EN_VIVO],
      [EstadoSala.EN_VIVO]: [EstadoSala.FINALIZADO],
      [EstadoSala.FINALIZADO]: [],
    };

    if (!validTransitions[estadoActual as EstadoSala]?.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición no permitida: no se puede cambiar de "${estadoActual}" a "${nuevoEstado}"`,
      );
    }

    // EN_VIVO guard: requiere al menos 1 estudiante en la sala
    if (nuevoEstado === EstadoSala.EN_VIVO) {
      const estudiantesCount = await this.prisma.participantes.count({
        where: {
          salaId: id,
          deletedAt: null,
          rol: 'estudiante',
        },
      });

      if (estudiantesCount === 0) {
        throw new BadRequestException(
          'No se puede iniciar la sala en vivo sin estudiantes. Debe haber al menos 1 estudiante.',
        );
      }
    }

    // Persistir en DB también para que sobreviva a reinicios de Redis
    await this.prisma.salas.update({
      where: { salaId: id },
      data: { estado: nuevoEstado },
    });

    await this.roomStateCache.setRoomEstado(sala.tokenCompartido, nuevoEstado);

    // Al pasar a EN_VIVO, asegurar que exista una ronda activa con preguntas
    if (nuevoEstado === EstadoSala.EN_VIVO) {
      const ronda = await this.ensureRondaActiva(
        sala.salaId,
        sala.bancoId,
        sala.limitePreguntas,
        sala.tokenCompartido,
      );

      // Notify the gateway so it can broadcast `info_ronda` to the room.
      // Without this, the frontend stays on "Esperando información de la
      // ronda..." because no WS event tells it the round started.
      //
      // Payload matches the frontend RondaInfo contract: { ronda, totalRondas, premio }.
      // The gateway forwards it as `info_ronda` to the room.
      const totalRondas =
        ronda?.preguntasAsignadas?.length ?? sala.limitePreguntas;
      const currentIndex = ronda
        ? Math.max(
            0,
            ronda.preguntasAsignadas.findIndex(
              (id: number) => id === ronda.preguntaActualId,
            ),
          )
        : 0;
      this.eventEmitter.emit('sala.iniciada', {
        tokenCompartido: sala.tokenCompartido,
        infoRonda: {
          ronda: currentIndex >= 0 ? currentIndex + 1 : 1,
          totalRondas,
          premio: '$0', // Prize configured per room; not stored on Ronda — UI computes from sala config
        },
      });
    }

    return { salaId: sala.salaId, estado: nuevoEstado };
  }

  private async ensureRondaActiva(
    salaId: number,
    bancoId: number,
    limitePreguntas: number,
    tokenCompartido: string,
  ): Promise<{
    rondaId: number;
    preguntasAsignadas: number[];
    preguntaActualId: number | null;
  } | null> {
    const existing = await this.prisma.rondas.findFirst({
      where: { salaId, estado: 'jugando' },
    });
    if (existing) {
      return {
        rondaId: existing.rondaId,
        preguntasAsignadas: (existing.preguntasAsignadas as number[]) ?? [],
        preguntaActualId: existing.preguntaActualId,
      };
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
        await this.participantsCache.getHistoricalParticipants(tokenCompartido);
      const nickname =
        cachedNicknames.find((n) => !n.startsWith('Host-')) ??
        cachedNicknames[0];
      if (nickname) {
        participante = await this.prisma.participantes.upsert({
          where: { salaId_nickname: { salaId, nickname } },
          update: {},
          create: { salaId, nickname, rol: 'observador' },
        });
      }
    }

    if (!participante) return null;

    const preguntas = await this.prisma.preguntas.findMany({
      where: { bancoId },
      take: limitePreguntas,
      orderBy: { nivel: 'asc' },
    });

    if (preguntas.length === 0) return null;

    const created = await this.prisma.rondas.create({
      data: {
        salaId,
        participanteId: participante.participanteId,
        numeroRonda: 1,
        estado: 'jugando',
        preguntasAsignadas: preguntas.map((p) => p.preguntaId),
        fechaInicio: new Date(),
      },
    });

    return {
      rondaId: created.rondaId,
      preguntasAsignadas: preguntas.map((p) => p.preguntaId),
      preguntaActualId: created.preguntaActualId,
    };
  }
}
