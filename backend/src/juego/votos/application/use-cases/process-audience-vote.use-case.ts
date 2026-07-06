import { Injectable, Logger } from '@nestjs/common';
import { ValidateVoteUniquenessUseCase } from './validate-vote-uniqueness.use-case';
import { VotosService } from '../votos.service';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { VotesCacheService } from '../../infrastructure/cache/votes-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

export interface VotePayload {
  salaId: number;
  rondaId: number;
  tokenCompartido: string;
  preguntaId: number;
  participanteId: number;
  opcionId: number;
}

@Injectable()
export class ProcessAudienceVoteUseCase {
  private readonly logger = new Logger(ProcessAudienceVoteUseCase.name);

  constructor(
    private readonly validateVoteUniqueness: ValidateVoteUniquenessUseCase,
    private readonly votosService: VotosService,
    private readonly cacheService: RoomStateCacheService,
    private readonly votesCache: VotesCacheService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: VotePayload) {
    // 1. Validar duplicados con Redis (Atómico)
    const votoPermitido = await this.validateVoteUniqueness.execute(
      payload.salaId,
      payload.preguntaId,
      payload.participanteId,
    );

    if (!votoPermitido) {
      return {
        success: false,
        message:
          'Acción bloqueada: Ya has enviado una respuesta para esta pregunta.',
      };
    }

    // 2. Registrar el voto en el sistema de votos (caché para bulk insert)
    await this.votosService.registrarVoto(
      payload.rondaId,
      payload.preguntaId,
      payload.participanteId,
      payload.opcionId,
    );

    this.logger.log(
      `Voto procesado: Participante ${payload.participanteId} en ronda ${payload.rondaId}`,
    );

    // 3. Calcular nueva distribución (O(4) en lugar de O(N))
    const distMap = await this.votesCache.getDistribution(
      payload.rondaId,
      payload.preguntaId,
    );
    const activeQuestion = await this.cacheService.getActiveQuestion(
      payload.tokenCompartido,
    );

    const distribucion: any = { total: 0 };

    if (activeQuestion) {
      activeQuestion.opciones.forEach((o: any) => {
        const count = distMap.get(o.opcionId) ?? 0;
        distribucion[o.letra] = count;
        distribucion.total += count;
      });
    } else {
      for (const count of distMap.values()) {
        distribucion.total += count;
      }
    }

    // 4. Broadcaster distribución al resto de la sala para que las barras
    //    del público se actualicen en vivo. Sin este emit, sólo el votante
    //    ve la distribución (vía HTTP response) y los demás participantes
    //    nunca ven las barras actualizarse.
    //    El gateway reenvía este evento como `voto_recibido` (ver
    //    JuegoGateway.handlePublicoVoteBroadcast).
    this.eventEmitter.emit(GameEvents.VOTOS.VOTO_PUBLICO_RECIBIDO, {
      tokenCompartido: payload.tokenCompartido,
      resultado: distribucion,
    });

    return {
      success: true,
      message: 'Voto registrado correctamente.',
      distribucion,
      data: {
        participanteId: payload.participanteId,
        tokenCompartido: payload.tokenCompartido,
      },
    };
  }
}
