import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

@Injectable()
export class EliminateOptions5050UseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(preguntaId: number): Promise<{ opcionesEliminadas: number[] }> {
    const pregunta = await this.prisma.preguntas.findUnique({
      where: { preguntaId },
      include: {
        opciones: {
          select: { opcionId: true, esCorrecta: true },
        },
      },
    });

    if (!pregunta) {
      throw new NotFoundException(
        `La pregunta con ID ${preguntaId} no existe.`,
      );
    }

    const opcionesIncorrectas = pregunta.opciones
      .filter((o) => !o.esCorrecta)
      .map((o) => o.opcionId);

    if (opcionesIncorrectas.length < 2) {
      return { opcionesEliminadas: [] };
    }

    // Fisher-Yates shuffle
    const shuffled = [...opcionesIncorrectas];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const opcionesEliminadas = shuffled.slice(0, 2);

    return { opcionesEliminadas };
  }
}
