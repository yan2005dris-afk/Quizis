import { Injectable } from '@nestjs/common';
import { VotesCacheService } from '../cache/votes-cache.service';

@Injectable()
export class RegisterVoteUseCase {
  constructor(private readonly cacheService: VotesCacheService) {}

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
