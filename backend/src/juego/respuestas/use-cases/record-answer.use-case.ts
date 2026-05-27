import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

export interface RecordAnswerData {
  rondaId: number;
  preguntaId: number;
  opcionId: number;
  esCorrecta: boolean;
  comodinUsado?: string | null;
}

@Injectable()
export class RecordAnswerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: RecordAnswerData): Promise<void> {
    await this.prisma.respuestasRonda.create({
      data: {
        rondaId: data.rondaId,
        preguntaId: data.preguntaId,
        opcionId: data.opcionId,
        esCorrecta: data.esCorrecta,
        comodinUsado: data.comodinUsado ?? null,
      },
    });
  }
}
