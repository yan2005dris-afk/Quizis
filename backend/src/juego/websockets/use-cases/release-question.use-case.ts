import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';

@Injectable()
export class ReleaseQuestionUseCase {
  private readonly logger = new Logger(ReleaseQuestionUseCase.name);

  constructor(private readonly cacheService: RoomStateCacheUseCase) {}

  async execute(tokenCompartido: string, pregunta: any) {
    this.logger.log(
      `Liberando pregunta para sala ${tokenCompartido}: ${pregunta.preguntaId}`,
    );

    // 1. Verificar si hay una pregunta activa y si está respondida
    const status = await this.cacheService.getQuestionStatus(tokenCompartido);

    if (status === 'released') {
      throw new BadRequestException(
        'No se puede liberar una nueva pregunta hasta que la actual sea respondida.',
      );
    }

    // 2. Guardar en Redis
    await this.cacheService.setActiveQuestion(tokenCompartido, pregunta);

    return {
      success: true,
      message: 'Pregunta liberada y guardada en caché.',
    };
  }
}
