import { Injectable } from '@nestjs/common';
import { VotesCacheUseCase } from '../../../infrastructure/cache/use-cases/votes-cache.use-case';

@Injectable()
export class RegisterVoteUseCase {
  constructor(private readonly cacheService: VotesCacheUseCase) {}

  async execute(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    await this.cacheService.setVote(
      rondaId,
      preguntaId,
      participanteId,
      opcionId,
    );
  }
}
