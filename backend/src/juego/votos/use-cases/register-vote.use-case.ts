import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class RegisterVoteUseCase {
  constructor(private readonly cacheService: CacheService) {}

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
