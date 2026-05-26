import { Injectable, Logger } from '@nestjs/common';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

@Injectable()
export class HandleDisconnectUseCase {
  private readonly logger = new Logger(HandleDisconnectUseCase.name);

  constructor(private readonly cacheService: ParticipantsCacheUseCase) {}

  async execute(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }) {
    await this.cacheService.removeParticipantOnline(
      info.tokenCompartido,
      info.nickname,
    );

    const participants = await this.cacheService.getOnlineParticipants(
      info.tokenCompartido,
    );

    this.logger.log(
      `${info.nickname} salió de la sala ${info.tokenCompartido} (Socket: ${info.socketId})`,
    );

    return { tokenCompartido: info.tokenCompartido, participants };
  }
}
