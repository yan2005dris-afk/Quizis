import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EstadoSala } from '../dto/update-sala-estado.dto';

@Injectable()
export class UpdateEstadoSalaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(salaId: number, nuevoEstado: EstadoSala) {
    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    // Validar máquina de estados
    const estadoActual = sala.estado as EstadoSala;

    if (estadoActual === nuevoEstado) {
      return sala; // No hay cambio
    }

    const isValidTransition = this.validateTransition(
      estadoActual,
      nuevoEstado,
    );

    if (!isValidTransition) {
      throw new BadRequestException(
        `Transición de estado no permitida: de ${estadoActual} a ${nuevoEstado}`,
      );
    }

    const updatedSala = await this.prisma.salas.update({
      where: { salaId },
      data: { estado: nuevoEstado },
    });

    return updatedSala;
  }

  private validateTransition(
    actual: EstadoSala,
    nuevo: EstadoSala,
  ): boolean {
    const transitions: Record<EstadoSala, EstadoSala[]> = {
      [EstadoSala.BORRADOR]: [EstadoSala.ESPERANDO],
      [EstadoSala.ESPERANDO]: [EstadoSala.EN_VIVO, EstadoSala.FINALIZADO], // puede cancelarse y finalizar
      [EstadoSala.EN_VIVO]: [EstadoSala.FINALIZADO],
      [EstadoSala.FINALIZADO]: [], // Estado terminal
    };

    const allowedNextStates = transitions[actual] || [];
    return allowedNextStates.includes(nuevo);
  }
}
