import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class GetVotesFromCacheUseCase {
  constructor(private readonly cacheService: CacheService) {}

  async execute(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }
}
