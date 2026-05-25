import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class HandleDisconnectUseCase {
  private readonly logger = new Logger(HandleDisconnectUseCase.name);

  constructor(private readonly cacheService: CacheService) {}

  async execute(info: { tokenCompartido: string; nickname: string; socketId: string }) {
    await this.cacheService.removeParticipantOnline(
      info.tokenCompartido,
      info.nickname,
    );
    
    this.logger.log(
      `${info.nickname} salió de la sala ${info.tokenCompartido} (Socket: ${info.socketId})`,
    );
  }
}
