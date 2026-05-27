import { Injectable, Logger } from '@nestjs/common';
import { ValidateVoteUniquenessUseCase } from './validate-vote-uniqueness.use-case';
import { VotosService } from '../../votos/votos.service';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';

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
    private readonly validateVoteUniquenessUseCase: ValidateVoteUniquenessUseCase,
    private readonly votosService: VotosService,
    private readonly cacheService: RoomStateCacheUseCase,
  ) {}

  async execute(payload: VotePayload) {
    // 1. Validar duplicados con Redis (Atómico)
    const votoPermitido = await this.validateVoteUniquenessUseCase.execute(
      payload.rondaId,
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

    // 3. Calcular nueva distribución
    const votos = await this.votosService.obtenerVotosCache(
      payload.rondaId,
      payload.preguntaId,
    );
    const activeQuestion = await this.cacheService.getActiveQuestion(
      payload.tokenCompartido,
    );

    const distribucion: any = { total: votos.length };

    if (activeQuestion) {
      // Inicializar en 0
      activeQuestion.opciones.forEach((o: any) => {
        distribucion[o.letra] = 0;
      });

      // Contar
      votos.forEach((v) => {
        const opcion = activeQuestion.opciones.find(
          (o: any) => o.opcionId === v.opcionId,
        );
        if (opcion) {
          distribucion[opcion.letra]++;
        }
      });
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
