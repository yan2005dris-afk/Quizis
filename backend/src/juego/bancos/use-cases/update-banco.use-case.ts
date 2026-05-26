import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class UpdateBancoUseCase {
  private readonly logger = new Logger(UpdateBancoUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, dto: { nombre?: string; descripcion?: string }) {
    this.logger.log(`Actualizando banco ${id}`);
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: id },
    });

    if (!banco) {
      throw new NotFoundException(
        `Banco de preguntas con ID ${id} no encontrado`,
      );
    }

    return this.prisma.bancoPreguntas.update({
      where: { bancoId: id },
      data: {
        nombre: dto.nombre ?? banco.nombre,
        descripcion:
          dto.descripcion !== undefined ? dto.descripcion : banco.descripcion,
      },
    });
  }
}
