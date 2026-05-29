import { Injectable, Logger } from '@nestjs/common';
import { SelectRandomConsultantUseCase } from '../../comodines/use-cases/select-random-consultant.use-case';
import { HelperCacheUseCase } from '../../../infrastructure/cache/use-cases/helper-cache.use-case';

@Injectable()
export class ActivateCallJokerUseCase {
  private readonly logger = new Logger(ActivateCallJokerUseCase.name);

  constructor(
    private readonly selectRandomConsultant: SelectRandomConsultantUseCase,
    private readonly helperCache: HelperCacheUseCase,
  ) {}

  async execute(
    tokenCompartido: string,
  ): Promise<
    | { success: true; consultor: { nickname: string } }
    | { success: false; message: string }
  > {
    this.logger.log(`Activando comodín llamada en sala: ${tokenCompartido}`);

    const consultor =
      await this.selectRandomConsultant.execute(tokenCompartido);

    if (!consultor) {
      this.logger.warn(
        `No hay consultores disponibles en sala: ${tokenCompartido}`,
      );
      return {
        success: false,
        message: 'No hay compañeros en línea disponibles.',
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
