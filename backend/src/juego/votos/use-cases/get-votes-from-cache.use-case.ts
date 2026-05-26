import { Injectable } from '@nestjs/common';
import { VotesCacheUseCase } from '../../../infrastructure/cache/use-cases/votes-cache.use-case';

@Injectable()
export class GetVotesFromCacheUseCase {
  constructor(private readonly cacheService: VotesCacheUseCase) {}

  async execute(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }
}
