import { Module } from '@nestjs/common';
import { ComodinesController } from './interfaces/comodines.controller';
import { ComodinesRestController } from './interfaces/controllers/comodines-rest.controller';
import { ComodinesService } from './application/comodines.service';
import { GetIaSuggestionUseCase } from './application/use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './application/use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './application/use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './application/use-cases/eliminate-options-5050.use-case';
import { BlockComodinUseCase } from './application/use-cases/block-comodin.use-case';
import { ActivateCallJokerUseCase } from './application/use-cases/activate-call-joker.use-case';
import { SendHintUseCase } from './application/use-cases/send-hint.use-case';
import { HelperCacheService } from './infrastructure/cache/helper-cache.service';
import { CacheModule } from '../../core/cache/cache.module';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';
import { VotosModule } from '../votos/votos.module';
import { SalasModule } from '../salas/salas.module';
import { RoomBroadcastModule } from '../infrastructure/websockets/room-broadcast.module';

@Module({
  imports: [
    CacheModule,
    DatabaseModule,
    VotosModule,
    SalasModule,
    RoomBroadcastModule,
  ],
  controllers: [ComodinesController, ComodinesRestController],
  providers: [
    ComodinesService,
    GetIaSuggestionUseCase,
    SelectRandomConsultantUseCase,
    GetPublicVoteResultsUseCase,
    EliminateOptions5050UseCase,
    BlockComodinUseCase,
    ActivateCallJokerUseCase,
    SendHintUseCase,
    HelperCacheService,
  ],
  exports: [
    ComodinesService,
    SelectRandomConsultantUseCase,
    ActivateCallJokerUseCase,
    BlockComodinUseCase,
    SendHintUseCase,
    HelperCacheService,
  ],
})
export class ComodinesModule {}
