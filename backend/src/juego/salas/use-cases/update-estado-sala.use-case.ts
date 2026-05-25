import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { UpdateEstadoSalaDto, EstadoSala } from '../dto/update-estado-sala.dto';

/**
 * Caso de uso: Actualizar el estado de una sala de juego.
 *
 * Implementa una máquina de estados finita (FSM) que controla
 * las transiciones válidas del ciclo de vida de la sala:
 *   BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO
 *
 * También permite retroceder de ESPERANDO_ALUMNOS → BORRADOR
 * en caso de que el docente necesite reconfigurar la sala.
 */
@Injectable()
export class UpdateEstadoSalaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la transición de estado de una sala.
   * @param id - ID de la sala a actualizar.
   * @param updateEstadoSalaDto - DTO con el nuevo estado solicitado.
   * @returns La sala actualizada con su nuevo estado.
   * @throws NotFoundException si la sala no existe.
   * @throws BadRequestException si la transición de estado no es válida.
   */
  async execute(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    // Buscar la sala por su ID
    const sala = await this.prisma.salas.findUnique({ where: { salaId: id } });
    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    const nuevoEstado = updateEstadoSalaDto.estado;

    // Mapa de transiciones válidas (máquina de estados)
    const validTransitions: Record<EstadoSala, EstadoSala[]> = {
      [EstadoSala.BORRADOR]: [EstadoSala.ESPERANDO_ALUMNOS],
      [EstadoSala.ESPERANDO_ALUMNOS]: [EstadoSala.BORRADOR, EstadoSala.EN_VIVO],
      [EstadoSala.EN_VIVO]: [EstadoSala.FINALIZADO],
      [EstadoSala.FINALIZADO]: [], // Estado terminal, no permite transiciones
    };

    // Validar que la transición solicitada sea permitida
    if (!validTransitions[sala.estado as EstadoSala]?.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición no permitida: no se puede cambiar de "${sala.estado}" a "${nuevoEstado}"`,
      );
    }

    // Persistir el nuevo estado en la base de datos
    const updatedSala = await this.prisma.salas.update({
      where: { salaId: id },
      data: { estado: nuevoEstado },
    });

    return updatedSala;
  }
}
