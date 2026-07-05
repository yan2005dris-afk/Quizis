import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SelectRandomConsultantUseCase } from './select-random-consultant.use-case';
import { HelperCacheService } from '../../infrastructure/cache/helper-cache.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

@Injectable()
export class ActivateCallJokerUseCase {
  private readonly logger = new Logger(ActivateCallJokerUseCase.name);

  constructor(
    private readonly selectRandomConsultant: SelectRandomConsultantUseCase,
    private readonly helperCache: HelperCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tokenCompartido: string) {
    const consultor =
      await this.selectRandomConsultant.execute(tokenCompartido);

    if (!consultor) {
      return {
        success: false,
        message: 'No hay compañeros disponibles para la llamada.',
      };
    }

    await this.helperCache.saveActiveHelper(
      tokenCompartido,
      consultor.nickname,
    );

    this.logger.log(
      `Consultor seleccionado: ${consultor.nickname} en sala: ${tokenCompartido}`,
    );

    this.eventEmitter.emit(GameEvents.COMODINES.CONSULTOR_SELECCIONADO, {
      tokenCompartido,
      nicknameConsultor: consultor.nickname,
    });

    return { success: true, consultor: { nickname: consultor.nickname } };
  }
}
