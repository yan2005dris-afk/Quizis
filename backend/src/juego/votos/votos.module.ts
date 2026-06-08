import { Module } from '@nestjs/common';
import { VotosService } from './votos.service';
import { VotosController } from './votos.controller';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/prisma/prisma.module';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';
import { ProcessAudienceVoteWebsocket } from './websockets/process-audience-vote.websocket';
import { ValidateVoteUniquenessWebsocket } from './websockets/validate-vote-uniqueness.websocket';
import { EvaluateConsensusWebsocket } from './websockets/evaluate-consensus.websocket';
import { SubmitAnswerWebsocket } from './websockets/submit-answer.websocket';
import { VotesCacheService } from './cache/votes-cache.service';
import { ConsensusCacheService } from './cache/consensus-cache.service';
import { ConsensusListener } from './listeners/consensus.listener';
import { SalasModule } from '../salas/salas.module';
import { RespuestasModule } from '../respuestas/respuestas.module';

@Module({
  imports: [CacheModule, DatabaseModule, SalasModule, RespuestasModule],
  controllers: [VotosController],
  providers: [
    VotosService,
    RegisterVoteUseCase,
    GetVotesFromCacheUseCase,
    PersistVotesUseCase,
    ProcessAudienceVoteWebsocket,
    ValidateVoteUniquenessWebsocket,
    EvaluateConsensusWebsocket,
    SubmitAnswerWebsocket,
    VotesCacheService,
    ConsensusCacheService,
    ConsensusListener,
  ],
  exports: [
    VotosService,
    ProcessAudienceVoteWebsocket,
    EvaluateConsensusWebsocket,
    SubmitAnswerWebsocket,
    ConsensusCacheService,
    VotesCacheService,
  ],
})
export class VotosModule {}
