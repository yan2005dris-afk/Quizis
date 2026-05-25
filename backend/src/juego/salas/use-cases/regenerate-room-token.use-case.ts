import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RegenerateRoomTokenUseCase {
  private readonly logger = new Logger(RegenerateRoomTokenUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(salaId: number) {
    this.logger.log(`Regenerando token para sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    const nuevoToken = uuidv4();

    const actualizada = await this.prisma.salas.update({
      where: { salaId },
      data: { tokenCompartido: nuevoToken },
    });

    return {
      success: true,
      tokenCompartido: actualizada.tokenCompartido,
      message: 'Token regenerado exitosamente.',
    };
  }
}
