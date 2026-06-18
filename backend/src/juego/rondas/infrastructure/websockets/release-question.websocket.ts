import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RoomStateCacheService } from '../../../salas/infrastructure/cache/room-state-cache.service';

@Injectable()
export class ReleaseQuestionWebsocket {
  private readonly logger = new Logger(ReleaseQuestionWebsocket.name);

  constructor(private readonly cacheService: RoomStateCacheService) {}

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
