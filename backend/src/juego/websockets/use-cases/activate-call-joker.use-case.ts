import { Injectable, Logger } from '@nestjs/common';
import { SelectRandomConsultantUseCase } from '../../comodines/use-cases/select-random-consultant.use-case';
import { HelperCacheUseCase } from '../../../infrastructure/cache/use-cases/helper-cache.use-case';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

@Injectable()
export class ActivateCallJokerUseCase {
  private readonly logger = new Logger(ActivateCallJokerUseCase.name);

  constructor(
    private readonly selectRandomConsultant: SelectRandomConsultantUseCase,
    private readonly helperCache: HelperCacheUseCase,
    private readonly participantsCache: ParticipantsCacheUseCase,
  ) {}

  async execute(
    tokenCompartido: string,
    consultorNickname?: string,
  ): Promise<
    | { success: true; consultor: { nickname: string } }
    | { success: false; message: string }
  > {
    this.logger.log(`Activando comodín llamada en sala: ${tokenCompartido}`);

    if (consultorNickname) {
      const online =
        await this.participantsCache.getOnlineParticipants(tokenCompartido);
      if (!online.includes(consultorNickname)) {
        return {
          success: false,
          message: 'El observador seleccionado ya no está conectado.',
        };
      }
      await this.helperCache.saveActiveHelper(
        tokenCompartido,
        consultorNickname,
      );
      this.logger.log(
        `Consultor elegido por encuestado: ${consultorNickname} en sala: ${tokenCompartido}`,
      );
      return { success: true, consultor: { nickname: consultorNickname } };
    }

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
