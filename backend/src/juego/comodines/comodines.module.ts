import { Module } from '@nestjs/common';
import { ComodinesController } from './interfaces/comodines.controller';
import { ComodinesRestController } from './interfaces/controllers/comodines-rest.controller';
import { ComodinesService } from './application/comodines.service';
import { GetIaSuggestionUseCase } from './application/use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './application/use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './application/use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './application/use-cases/eliminate-options-5050.use-case';
import { ActivateCallJokerWebsocket } from './infrastructure/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from './infrastructure/websockets/send-hint.websocket';
import { HelperCacheService } from './infrastructure/cache/helper-cache.service';
import { CacheModule } from '../../core/cache/cache.module';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';
import { VotosModule } from '../votos/votos.module';
import { SalasModule } from '../salas/salas.module';

@Module({
  imports: [CacheModule, DatabaseModule, VotosModule, SalasModule],
  controllers: [ComodinesController, ComodinesRestController],
  providers: [
    ComodinesService,
    GetIaSuggestionUseCase,
    SelectRandomConsultantUseCase,
    GetPublicVoteResultsUseCase,
    EliminateOptions5050UseCase,
    ActivateCallJokerWebsocket,
    SendHintWebsocket,
    HelperCacheService,
  ],
  exports: [
    ComodinesService,
    SelectRandomConsultantUseCase,
    ActivateCallJokerWebsocket,
    SendHintWebsocket,
    HelperCacheService,
  ],
})
export class ComodinesModule {}
