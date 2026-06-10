import { Injectable } from '@nestjs/common';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';
import { ConsensusCacheService } from '../infrastructure/cache/consensus-cache.service';
import { ParticipantsCacheService } from '../../salas/infrastructure/cache/participants-cache.service';
import { SalasService } from '../../salas/application/salas.service';

@Injectable()
export class VotosService {
  constructor(
    private readonly registerVoteUseCase: RegisterVoteUseCase,
    private readonly getVotesFromCacheUseCase: GetVotesFromCacheUseCase,
    private readonly persistVotesUseCase: PersistVotesUseCase,
    private readonly consensusCache: ConsensusCacheService,
    private readonly participantsCache: ParticipantsCacheService,
    private readonly salasService: SalasService,
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

  async initConsensusRequired(
    token: string,
    preguntaId: number,
  ): Promise<void> {
    const nicknames = await this.participantsCache.getOnlineParticipants(token);
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      token,
      nicknames,
    );
    const students = participantesDb
      .filter((p: any) => p.rol === 'estudiante')
      .map((p: any) => p.nombre as string);

    await this.consensusCache.initializeRequired(token, preguntaId, students);
  }
}
