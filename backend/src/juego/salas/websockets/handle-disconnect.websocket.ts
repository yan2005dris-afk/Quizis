import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';
import { GameEvents } from '../../../infrastructure/common/events/game-events.types';

@Injectable()
export class HandleDisconnectWebsocket {
  private readonly logger = new Logger(HandleDisconnectWebsocket.name);

  constructor(
    private readonly cacheService: ParticipantsCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }): Promise<{
    tokenCompartido: string;
    participants: string[];
  }> {
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

    // Emitir evento para que otros dominios (ej: Votos) reaccionen
    this.eventEmitter.emit(GameEvents.SALA.PARTICIPANTE_DESCONECTADO, {
      tokenCompartido: info.tokenCompartido,
      nickname: info.nickname,
      socketId: info.socketId,
    });

    return {
      tokenCompartido: info.tokenCompartido,
      participants,
    };
  }
}
