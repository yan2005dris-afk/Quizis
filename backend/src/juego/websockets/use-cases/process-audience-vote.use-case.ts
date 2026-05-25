import { Injectable, Logger } from '@nestjs/common';
import { ValidateVoteUniquenessUseCase } from './validate-vote-uniqueness.use-case';
import { VotosService } from '../../votos/votos.service';

export interface VotePayload {
  salaId: number;
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
  ) {}

  async execute(payload: VotePayload) {
    // 1. Validar duplicados con Redis (Atómico)
    const votoPermitido = await this.validateVoteUniquenessUseCase.execute(
      payload.salaId,
      payload.preguntaId,
      payload.participanteId,
    );

    if (!votoPermitido) {
      return {
        success: false,
        message: 'Acción bloqueada: Ya has enviado una respuesta para esta pregunta.',
      };
    }

    // 2. Registrar el voto en el sistema de votos (caché para bulk insert)
    await this.votosService.registrarVoto(
      payload.salaId,
      payload.preguntaId,
      payload.participanteId,
      payload.opcionId,
    );

    this.logger.log(`Voto procesado: Participante ${payload.participanteId} en sala ${payload.salaId}`);

    return {
      success: true,
      message: 'Voto registrado correctamente.',
      data: {
        participanteId: payload.participanteId,
        tokenCompartido: payload.tokenCompartido,
      },
    };
  }
}
