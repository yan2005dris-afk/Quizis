import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SalasService } from '../../../salas/application/salas.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

@Injectable()
export class BlockComodinUseCase {
  constructor(
    private readonly salasService: SalasService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: {
    tokenCompartido: string;
    tipo: string;
    userId: number;
  }): Promise<void> {
    // Crucial Timing Rule: Event emission MUST occur AFTER state has been successfully updated/persisted
    await this.salasService.addBlockedComodin(payload.tokenCompartido, payload.tipo);

    this.eventEmitter.emit(GameEvents.COMODINES.BLOQUEADO, {
      tokenCompartido: payload.tokenCompartido,
      userId: payload.userId,
      tipo: payload.tipo,
    });
  }
}
