import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GuardarPreguntasDto } from 'src/games/bulk-upload/dto/guardar-preguntas.dto';

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async guardarPreguntas(dto: GuardarPreguntasDto) {
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: dto.bancoId },
    });
    if (!banco) {
      throw new NotFoundException(
        `No se encontró el banco de preguntas con ID ${dto.bancoId}.`,
      );
    }

    for (let i = 0; i < dto.preguntas.length; i++) {
      const pregunta = dto.preguntas[i];
      const correctas = pregunta.opciones.filter((op) => op.esCorrecta).length;
      if (correctas !== 1) {
        throw new BadRequestException(
          `La pregunta ${i + 1} debe tener exactamente 1 opción correcta, pero tiene ${correctas}.`,
        );
      }
    }

    const creadas = await this.prisma.$transaction(
      dto.preguntas.map((pregunta) =>
        this.prisma.preguntas.create({
          data: {
            bancoId: dto.bancoId,
            texto: pregunta.texto,
            categoria: pregunta.categoria,
            nivel: pregunta.nivel ?? 1,
            monto: pregunta.monto,
            feedbackCorrecto: pregunta.feedbackCorrecto,
            feedbackIncorrecto: pregunta.feedbackIncorrecto,
            opciones: {
              create: pregunta.opciones.map((op) => ({
                texto: op.texto,
                esCorrecta: op.esCorrecta,
              })),
            },
          },
        }),
      ),
    );

    this.logger.log(
      `Guardadas ${creadas.length} preguntas en banco ${dto.bancoId}.`,
    );

    return {
      totalGuardadas: creadas.length,
      bancoId: dto.bancoId,
    };
  }
}
