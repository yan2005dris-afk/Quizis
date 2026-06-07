import { Module } from '@nestjs/common';
import { VotosService } from './votos.service';
import { VotosController } from './votos.controller';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/prisma/prisma.module';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';
import { VotesCacheService } from './cache/votes-cache.service';

@Module({
  imports: [CacheModule, DatabaseModule],
  controllers: [VotosController],
  providers: [
    VotosService,
    RegisterVoteUseCase,
    GetVotesFromCacheUseCase,
    PersistVotesUseCase,
    VotesCacheService,
  ],
  exports: [VotosService],
})
export class VotosModule {}
