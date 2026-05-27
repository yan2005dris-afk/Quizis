import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HelperCacheUseCase } from '../../../infrastructure/cache/use-cases/helper-cache.use-case';

export interface SendHintPayload {
  tokenCompartido: string;
  preguntaId: number;
  pista: string;
}

@Injectable()
export class SendHintUseCase {
  private readonly logger = new Logger(SendHintUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helperCache: HelperCacheUseCase,
  ) {}

  async execute(
    payload: SendHintPayload,
  ): Promise<
    | { success: true; helperNickname: string; pista: string }
    | { success: false; message: string }
  > {
    const { tokenCompartido, preguntaId, pista } = payload;

    const rondaActiva = await this.prisma.rondas.findFirst({
      where: { sala: { tokenCompartido }, estado: 'jugando' },
    });

    if (!rondaActiva) {
      return { success: false, message: 'No hay una ronda activa en esta sala.' };
    }

    const helperNickname = await this.helperCache.getActiveHelper(tokenCompartido);
    if (!helperNickname) {
      return { success: false, message: 'No hay ninguna llamada activa en esta sala.' };
    }

    try {
      const existing = await this.prisma.respuestasRonda.findFirst({
        where: { rondaId: rondaActiva.rondaId, preguntaId },
      });

      if (existing) {
        await this.prisma.respuestasRonda.update({
          where: { respuestaId: existing.respuestaId },
          data: { comodinUsado: 'LLAMADA' },
        });
      } else {
        await this.prisma.respuestasRonda.create({
          data: {
            rondaId: rondaActiva.rondaId,
            preguntaId,
            comodinUsado: 'LLAMADA',
            esCorrecta: false,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error al persistir comodín LLAMADA: ${error}`);
    }

    await this.helperCache.removeActiveHelper(tokenCompartido);

    this.logger.log(
      `Pista transmitida y comodín LLAMADA registrado en sala: ${tokenCompartido}`,
    );

    return { success: true, helperNickname, pista };
  }
}
