import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { CreateBancoDto } from '../../interfaces/dto/create-banco.dto';

@Injectable()
export class CreateBancoUseCase {
  private readonly logger = new Logger(CreateBancoUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number, dto: CreateBancoDto) {
    this.logger.log(`Creando nuevo banco: ${dto.nombre}`);

    if (dto.preguntas && dto.preguntas.length > 0) {
      this.validatePreguntas(dto.preguntas);
    }

    return this.prisma.$transaction(async (tx) => {
      const banco = await tx.bancoPreguntas.create({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion ?? null,
          usuarioId,
        },
      });

      if (dto.preguntas && dto.preguntas.length > 0) {
        await Promise.all(
          dto.preguntas.map((pregunta) =>
            tx.preguntas.create({
              data: {
                bancoId: banco.bancoId,
                texto: pregunta.texto,
                categoria: pregunta.categoria,
                nivel: pregunta.nivel ?? 1,
                monto: pregunta.monto,
                feedbackCorrecto: pregunta.feedbackCorrecto,
                feedbackIncorrecto: pregunta.feedbackIncorrecto,
                opciones: {
                  create: pregunta.opciones.map((op) => ({
                    texto: op.texto,
                    esCorrecta: op.esCorrecta ?? false,
                  })),
                },
              },
            }),
          ),
        );
      }

      return tx.bancoPreguntas.findUniqueOrThrow({
        where: { bancoId: banco.bancoId },
        include: {
          _count: {
            select: { preguntas: true },
          },
        },
      });
    });
  }

  private validatePreguntas(preguntas: any[]) {
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      const correctas = pregunta.opciones.filter((op) => op.esCorrecta).length;
      if (correctas !== 1) {
        throw new BadRequestException(
          `La pregunta ${i + 1} debe tener exactamente 1 opción correcta, pero tiene ${correctas}.`,
        );
      }
    }
  }
}
