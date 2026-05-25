import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AddQuestionsUseCase {
  private readonly logger = new Logger(AddQuestionsUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(bancoId: number, preguntas: any[]) {
    this.logger.log(`Creando ${preguntas.length} preguntas en banco ${bancoId}`);
    this.validatePreguntas(preguntas);

    const creadas = await this.prisma.$transaction(
      preguntas.map((pregunta) =>
        this.prisma.preguntas.create({
          data: {
            bancoId,
            texto: pregunta.texto,
            categoria: pregunta.categoria,
            nivel: pregunta.nivel ?? 1,
            monto: pregunta.monto,
            feedbackCorrecto: pregunta.feedbackCorrecto,
            feedbackIncorrecto: pregunta.feedbackIncorrecto,
            opciones: {
              create: pregunta.opciones.map((op: any) => ({
                texto: op.texto,
                esCorrecta: op.esCorrecta ?? false,
              })),
            },
          },
        }),
      ),
    );

    this.logger.log(`Creadas ${creadas.length} preguntas en banco ${bancoId}`);
    return creadas.length;
  }

  private validatePreguntas(preguntas: any[]) {
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      const correctas = pregunta.opciones.filter((op: any) => op.esCorrecta).length;
      if (correctas !== 1) {
        throw new BadRequestException(
          `La pregunta ${i + 1} debe tener exactamente 1 opción correcta, pero tiene ${correctas}.`,
        );
      }
    }
  }
}
