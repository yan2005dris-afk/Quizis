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

    await this.roomStateCache.setRoomEstado(sala.tokenCompartido, nuevoEstado);

    return { salaId: sala.salaId, estado: nuevoEstado };
  }
}
