import { Module } from '@nestjs/common';
import { VotosService } from './votos.service';
import { VotosController } from './votos.controller';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/prisma.module';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';

@Module({
  imports: [CacheModule, DatabaseModule],
  controllers: [VotosController],
  providers: [
    VotosService,
    RegisterVoteUseCase,
    GetVotesFromCacheUseCase,
    PersistVotesUseCase,
  ],
  exports: [VotosService],
})
export class VotosModule {}
