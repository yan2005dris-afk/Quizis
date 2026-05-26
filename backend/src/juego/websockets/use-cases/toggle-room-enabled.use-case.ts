import { Injectable, Logger } from '@nestjs/common';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';

@Injectable()
export class ToggleRoomEnabledUseCase {
  private readonly logger = new Logger(ToggleRoomEnabledUseCase.name);

  constructor(private readonly cacheService: RoomStateCacheUseCase) {}

  async execute(tokenCompartido: string, enabled: boolean) {
    this.logger.log(
      `Cambiando estado de sala ${tokenCompartido} a: ${enabled ? 'Habilitada' : 'Deshabilitada'}`,
    );

    await this.cacheService.setRoomEnabled(tokenCompartido, enabled);

    return {
      success: true,
      enabled,
      message: `Sala ${enabled ? 'habilitada' : 'deshabilitada'} correctamente en caché.`,
    };
  }
}
