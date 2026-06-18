import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

@Injectable()
export class DeleteQuestionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(bancoId: number, preguntaId: number, usuarioId: number) {
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId },
    });

    if (!banco || banco.usuarioId !== usuarioId) {
      throw new NotFoundException(
        `Banco de preguntas con ID ${bancoId} no encontrado`,
      );
    }

    const pregunta = await this.prisma.preguntas.findFirst({
      where: { preguntaId, bancoId, deletedAt: null },
    });

    if (!pregunta) {
      throw new NotFoundException(
        `Pregunta ${preguntaId} no encontrada en el banco ${bancoId}`,
      );
    }

    await this.prisma.preguntas.update({
      where: { preguntaId },
      data: { deletedAt: new Date() },
    });

    return { preguntaId, deletedAt: new Date() };
  }
}
