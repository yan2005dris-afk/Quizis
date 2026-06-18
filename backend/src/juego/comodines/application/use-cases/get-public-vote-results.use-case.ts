import { Injectable, Logger } from '@nestjs/common';
import { VotosService } from '../../../votos/application/votos.service';

@Injectable()
export class GetPublicVoteResultsUseCase {
  private readonly logger = new Logger(GetPublicVoteResultsUseCase.name);

  constructor(private readonly votosService: VotosService) {}

  async execute(rondaId: number, preguntaId: number) {
    this.logger.log(
      `Calculando resultados de votación para pregunta ${preguntaId} en ronda ${rondaId}`,
    );

    const votos = await this.votosService.obtenerVotosCache(
      rondaId,
      preguntaId,
    );

    const conteo: Record<number, number> = {};
    votos.forEach((v) => {
      conteo[v.opcionId] = (conteo[v.opcionId] || 0) + 1;
    });

    return {
      totalVotos: votos.length,
      resultados: conteo,
    };
  }
}
