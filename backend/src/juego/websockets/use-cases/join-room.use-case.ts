import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

@Injectable()
export class JoinRoomUseCase {
  private readonly logger = new Logger(JoinRoomUseCase.name);

  constructor(private readonly cacheService: ParticipantsCacheUseCase) {}

  async execute(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }) {
    this.logger.log(
      `${payload.nombre} se unió a la sala con token: ${payload.tokenCompartido} (Socket: ${payload.socketId})`,
    );

    await this.cacheService.addParticipantOnline(
      payload.tokenCompartido,
      payload.nombre,
    );

    const participants = await this.cacheService.getOnlineParticipants(
      payload.tokenCompartido,
    );

    return {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
      participants,
    };
  }
}
