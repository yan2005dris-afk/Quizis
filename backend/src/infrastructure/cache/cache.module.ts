import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisModule } from '../database/redis/redis.module';
import { VotesCacheUseCase } from './use-cases/votes-cache.use-case';
import { ParticipantsCacheUseCase } from './use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from './use-cases/room-state-cache.use-case';
import { ChatCacheUseCase } from './use-cases/chat-cache.use-case';
import { HelperCacheUseCase } from './use-cases/helper-cache.use-case';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    VotesCacheUseCase,
    ParticipantsCacheUseCase,
    RoomStateCacheUseCase,
    ChatCacheUseCase,
    HelperCacheUseCase,
  ],
  exports: [
    CacheService,
    VotesCacheUseCase,
    ParticipantsCacheUseCase,
    RoomStateCacheUseCase,
    ChatCacheUseCase,
    HelperCacheUseCase,
  ],
})
export class CacheModule {}
