import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { UpdateEstadoSalaDto, EstadoSala } from '../dto/update-estado-sala.dto';

@Injectable()
export class UpdateEstadoSalaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomStateCache: RoomStateCacheUseCase,
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

    await this.roomStateCache.setRoomEstado(sala.tokenCompartido, nuevoEstado);

    if (nuevoEstado === EstadoSala.EN_VIVO) {
      await this.ensureRondaActiva(
        sala.salaId,
        sala.bancoId,
        sala.limitePreguntas,
      );
    }

    return { salaId: sala.salaId, estado: nuevoEstado };
  }

  private async ensureRondaActiva(
    salaId: number,
    bancoId: number,
    limitePreguntas: number,
  ): Promise<void> {
    const existing = await this.prisma.rondas.findFirst({
      where: { salaId, estado: 'jugando' },
    });
    if (existing) return;

    const participante =
      (await this.prisma.participantes.findFirst({
        where: { salaId, deletedAt: null, rol: 'estudiante' },
      })) ??
      (await this.prisma.participantes.findFirst({
        where: { salaId, deletedAt: null },
      }));

    if (!participante) return;

    const preguntas = await this.prisma.preguntas.findMany({
      where: { bancoId },
      take: limitePreguntas,
      orderBy: { nivel: 'asc' },
    });

    if (preguntas.length === 0) return;

    await this.prisma.rondas.create({
      data: {
        salaId,
        participanteId: participante.participanteId,
        numeroRonda: 1,
        estado: 'jugando',
        preguntasAsignadas: preguntas.map((p) => p.preguntaId),
        fechaInicio: new Date(),
      },
    });
  }
}
