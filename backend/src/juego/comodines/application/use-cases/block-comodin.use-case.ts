import { BadRequestException, Injectable } from '@nestjs/common';
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
    // Público requires a live audience: reject activation when no observers
    // are connected — there is nobody to poll.
    if (payload.tipo === 'PUBLICO') {
      const observadores = await this.salasService.contarObservadoresOnline(
        payload.tokenCompartido,
      );
      if (observadores === 0) {
        throw new BadRequestException(
          'No hay observadores conectados para activar el comodín Público',
        );
      }
    }

    // Crucial Timing Rule: Event emission MUST occur AFTER state has been successfully updated/persisted
    await this.salasService.addBlockedComodin(payload.tokenCompartido, payload.tipo);

    this.eventEmitter.emit(GameEvents.COMODINES.BLOQUEADO, {
      tokenCompartido: payload.tokenCompartido,
      userId: payload.userId,
      tipo: payload.tipo,
    });
  }
}
