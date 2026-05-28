import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { UpdatePreguntaDto } from '../dto/update-pregunta.dto';

@Injectable()
export class UpdateQuestionUseCase {
  private readonly logger = new Logger(UpdateQuestionUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    bancoId: number,
    preguntaId: number,
    dto: UpdatePreguntaDto,
    usuarioId: number,
  ) {
    this.logger.log(`Actualizando pregunta ${preguntaId} del banco ${bancoId}`);

    // Verify bank exists and is owned by the user
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId },
    });
    if (!banco || banco.usuarioId !== usuarioId) {
      throw new NotFoundException(
        `Banco de preguntas con ID ${bancoId} no encontrado`,
      );
    }

    const preguntaExistente = await this.prisma.preguntas.findFirst({
      where: { preguntaId, bancoId },
    });

    if (!preguntaExistente) {
      throw new NotFoundException(
        `Pregunta ${preguntaId} no encontrada en el banco ${bancoId}`,
      );
    }

    const { opciones, ...datosPregunta } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.preguntas.update({
        where: { preguntaId },
        data: {
          ...datosPregunta,
          updatedAt: new Date(),
        },
      });

      if (opciones) {
        await tx.opcionesPregunta.deleteMany({
          where: { preguntaId },
        });

        await tx.opcionesPregunta.createMany({
          data: opciones.map((o) => ({
            preguntaId,
            texto: o.texto,
            esCorrecta: o.esCorrecta,
          })),
        });
      }

      // Return the updated bank state (consistent with previous service implementation)
      return this.prisma.bancoPreguntas.findUnique({
        where: { bancoId },
        include: {
          preguntas: {
            include: { opciones: true },
            orderBy: { preguntaId: 'asc' },
          },
        },
      });
    });
  }
}
