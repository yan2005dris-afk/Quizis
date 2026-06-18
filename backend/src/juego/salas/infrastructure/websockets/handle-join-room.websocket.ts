import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ParticipantsCacheService } from '../cache/participants-cache.service';
import { RoomStateCacheService } from '../cache/room-state-cache.service';
import { SalasService } from '../../application/salas.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

@Injectable()
export class HandleJoinRoomWebsocket {
  private readonly logger = new Logger(HandleJoinRoomWebsocket.name);

  constructor(
    private readonly cacheService: ParticipantsCacheService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly salasService: SalasService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }): Promise<{
    tokenCompartido: string;
    nickname: string;
    participants: string[];
  }> {
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

    // Emitir evento para que otros dominios (ej: Votos) reaccionen
    this.eventEmitter.emit(GameEvents.SALA.PARTICIPANTE_UNIDO, {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
      socketId: payload.socketId,
    });

    return {
      tokenCompartido: payload.tokenCompartido,
      nickname: payload.nombre,
      participants,
    };
  }
}
