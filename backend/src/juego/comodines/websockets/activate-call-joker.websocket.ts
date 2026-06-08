import { Injectable, Logger } from '@nestjs/common';
import { SelectRandomConsultantUseCase } from '../use-cases/select-random-consultant.use-case';
import { HelperCacheService } from '../cache/helper-cache.service';

@Injectable()
export class ActivateCallJokerWebsocket {
  private readonly logger = new Logger(ActivateCallJokerWebsocket.name);

  constructor(
    private readonly selectRandomConsultant: SelectRandomConsultantUseCase,
    private readonly helperCache: HelperCacheService,
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

    return { success: true, consultor: { nickname: consultor.nickname } };
  }
}
