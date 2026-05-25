import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class GetBancoUseCase {
  private readonly logger = new Logger(GetBancoUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    this.logger.log(`Buscando banco de preguntas con ID: ${id}`);
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: id },
      include: {
        preguntas: {
          include: {
            opciones: true,
          },
          orderBy: {
            preguntaId: 'asc',
          },
        },
      },
    });

    if (!banco) {
      throw new NotFoundException(
        `Banco de preguntas con ID ${id} no encontrado`,
      );
    }

    return banco;
  }
}
