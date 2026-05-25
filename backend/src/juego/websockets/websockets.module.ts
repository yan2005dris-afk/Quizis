import { Module } from '@nestjs/common';
import { WebsocketsService } from './websockets.service';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { VotosModule } from '../votos/votos.module';
import { ValidateVoteUniquenessUseCase } from './use-cases/validate-vote-uniqueness.use-case';
import { JoinRoomUseCase } from './use-cases/join-room.use-case';
import { HandleDisconnectUseCase } from './use-cases/handle-disconnect.use-case';
import { ProcessAudienceVoteUseCase } from './use-cases/process-audience-vote.use-case';
import { ReleaseQuestionUseCase } from './use-cases/release-question.use-case';
import { SubmitAnswerUseCase } from './use-cases/submit-answer.use-case';
import { ToggleRoomEnabledUseCase } from './use-cases/toggle-room-enabled.use-case';

@Module({
  imports: [CacheModule, VotosModule],
  providers: [
    WebsocketsService,
    ValidateVoteUniquenessUseCase,
    JoinRoomUseCase,
    HandleDisconnectUseCase,
    ProcessAudienceVoteUseCase,
    ReleaseQuestionUseCase,
    SubmitAnswerUseCase,
    ToggleRoomEnabledUseCase,
  ],
  exports: [WebsocketsService],
})
export class WebsocketsModule {}
