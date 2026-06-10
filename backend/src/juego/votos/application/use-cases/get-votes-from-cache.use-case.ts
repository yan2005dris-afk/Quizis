import { Injectable } from '@nestjs/common';
import { VotesCacheService } from '../../infrastructure/cache/votes-cache.service';

@Injectable()
export class GetVotesFromCacheUseCase {
  constructor(private readonly cacheService: VotesCacheService) {}

  async execute(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }
}
