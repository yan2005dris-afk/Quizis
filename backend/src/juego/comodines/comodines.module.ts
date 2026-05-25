import { Module } from '@nestjs/common';
import { ComodinesController } from './comodines.controller';
import { ComodinesService } from './comodines.service';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/prisma.module';
import { VotosModule } from '../votos/votos.module';

@Module({
  imports: [CacheModule, DatabaseModule, VotosModule],
  controllers: [ComodinesController],
  providers: [
    ComodinesService,
    GetIaSuggestionUseCase,
    SelectRandomConsultantUseCase,
    GetPublicVoteResultsUseCase,
  ],
  exports: [ComodinesService],
})
export class ComodinesModule {}
