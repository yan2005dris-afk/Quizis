import { Injectable, Logger } from '@nestjs/common';
import { ValidateVoteUniquenessWebsocket } from './validate-vote-uniqueness.websocket';
import { VotosService } from '../../application/votos.service';
import { RoomStateCacheService } from '../../../salas/infrastructure/cache/room-state-cache.service';
import { VotesCacheService } from '../cache/votes-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

export interface VotePayload {
  salaId: number;
  rondaId: number;
  tokenCompartido: string;
  preguntaId: number;
  participanteId: number;
  opcionId: number;
}

@Injectable()
export class ProcessAudienceVoteWebsocket {
  private readonly logger = new Logger(ProcessAudienceVoteWebsocket.name);

  constructor(
    private readonly validateVoteUniqueness: ValidateVoteUniquenessWebsocket,
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
