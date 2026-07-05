import { Injectable, Logger } from '@nestjs/common';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';

@Injectable()
export class ToggleRoomEnabledUseCase {
  private readonly logger = new Logger(ToggleRoomEnabledUseCase.name);

  constructor(private readonly cacheService: RoomStateCacheService) {}

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
