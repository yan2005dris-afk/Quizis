import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

@Injectable()
export class ReleaseQuestionWebsocket {
  private readonly logger = new Logger(ReleaseQuestionWebsocket.name);

  constructor(
    private readonly cacheService: RoomStateCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    // 3. Emitir evento para que JuegoGateway haga broadcast WebSocket
    this.eventEmitter.emit(GameEvents.RONDAS.PREGUNTA_LIBERADA, {
      tokenCompartido,
      pregunta,
    });

    return {
      success: true,
      message: 'Pregunta liberada y guardada en caché.',
    };
  }
}
