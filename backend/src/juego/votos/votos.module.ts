import { Module } from '@nestjs/common';
import { VotosService } from './application/votos.service';
import { VotosController } from './interfaces/votos.controller';
import { RespuestasController } from './interfaces/controllers/respuestas.controller';
import { VotosRestController } from './interfaces/controllers/votos-rest.controller';
import { CacheModule } from '../../core/cache/cache.module';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';
import { RegisterVoteUseCase } from './application/use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './application/use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './application/use-cases/persist-votes.use-case';
import { ProcessAudienceVoteUseCase } from './application/use-cases/process-audience-vote.use-case';
import { ValidateVoteUniquenessUseCase } from './application/use-cases/validate-vote-uniqueness.use-case';
import { EvaluateConsensusUseCase } from './application/use-cases/evaluate-consensus.use-case';
import { SubmitAnswerUseCase } from './application/use-cases/submit-answer.use-case';
import { VotesCacheService } from './infrastructure/cache/votes-cache.service';
import { ConsensusCacheService } from './infrastructure/cache/consensus-cache.service';
import { ConsensusListener } from './infrastructure/listeners/consensus.listener';
import { SalasModule } from '../salas/salas.module';
import { RespuestasModule } from '../respuestas/respuestas.module';

@Module({
  imports: [CacheModule, DatabaseModule, SalasModule, RespuestasModule],
  controllers: [VotosController, RespuestasController, VotosRestController],
  providers: [
    VotosService,
    RegisterVoteUseCase,
    GetVotesFromCacheUseCase,
    PersistVotesUseCase,
    ProcessAudienceVoteUseCase,
    ValidateVoteUniquenessUseCase,
    EvaluateConsensusUseCase,
    SubmitAnswerUseCase,
    VotesCacheService,
    ConsensusCacheService,
    ConsensusListener,
  ],
  exports: [
    VotosService,
    ProcessAudienceVoteUseCase,
    EvaluateConsensusUseCase,
    SubmitAnswerUseCase,
    ConsensusCacheService,
    VotesCacheService,
  ],
})
export class VotosModule {}
