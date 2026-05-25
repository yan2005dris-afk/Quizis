import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class JoinRoomUseCase {
  private readonly logger = new Logger(JoinRoomUseCase.name);

  constructor(private readonly cacheService: CacheService) {}

  async execute(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }) {
    this.logger.log(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido} (Socket: ${payload.socketId})`,
    );

    // Registrar presencia en caché
    await this.cacheService.addParticipantOnline(
      payload.tokenCompartido,
      payload.nombre,
    );

    return {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
    };
  }
}
