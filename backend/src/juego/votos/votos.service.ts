import { Injectable } from '@nestjs/common';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';

@Injectable()
export class VotosService {
  constructor(
    private readonly registerVoteUseCase: RegisterVoteUseCase,
    private readonly getVotesFromCacheUseCase: GetVotesFromCacheUseCase,
    private readonly persistVotesUseCase: PersistVotesUseCase,
  ) {}

  async registrarVoto(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    return this.registerVoteUseCase.execute(
      rondaId,
      preguntaId,
      participanteId,
      opcionId,
    );
  }

  async obtenerVotosCache(rondaId: number, preguntaId: number) {
    return this.getVotesFromCacheUseCase.execute(rondaId, preguntaId);
  }

  async persistirVotos(
    rondaId: number,
    preguntaId: number,
  ): Promise<{ count: number }> {
    return this.persistVotesUseCase.execute(rondaId, preguntaId);
  }
}
