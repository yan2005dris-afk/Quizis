import { Module } from '@nestjs/common';
import { VotosService } from './application/votos.service';
import { VotosController } from './interfaces/votos.controller';
import { RespuestasController } from './interfaces/controllers/respuestas.controller';
import { CacheModule } from '../../core/cache/cache.module';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';
import { RegisterVoteUseCase } from './application/use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './application/use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './application/use-cases/persist-votes.use-case';
import { ProcessAudienceVoteWebsocket } from './infrastructure/websockets/process-audience-vote.websocket';
import { ValidateVoteUniquenessWebsocket } from './infrastructure/websockets/validate-vote-uniqueness.websocket';
import { EvaluateConsensusWebsocket } from './infrastructure/websockets/evaluate-consensus.websocket';
import { SubmitAnswerWebsocket } from './infrastructure/websockets/submit-answer.websocket';
import { VotesCacheService } from './infrastructure/cache/votes-cache.service';
import { ConsensusCacheService } from './infrastructure/cache/consensus-cache.service';
import { ConsensusListener } from './infrastructure/listeners/consensus.listener';
import { SalasModule } from '../salas/salas.module';
import { RespuestasModule } from '../respuestas/respuestas.module';

@Module({
  imports: [CacheModule, DatabaseModule, SalasModule, RespuestasModule],
  controllers: [VotosController, RespuestasController],
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
