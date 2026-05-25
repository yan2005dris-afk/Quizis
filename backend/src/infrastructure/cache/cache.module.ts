import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisModule } from '../database/redis/redis.module';
import { VotesCacheUseCase } from './use-cases/votes-cache.use-case';
import { ParticipantsCacheUseCase } from './use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from './use-cases/room-state-cache.use-case';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    VotesCacheUseCase,
    ParticipantsCacheUseCase,
    RoomStateCacheUseCase,
  ],
  exports: [
    CacheService,
    VotesCacheUseCase,
    ParticipantsCacheUseCase,
    RoomStateCacheUseCase,
  ],
})
export class CacheModule {}
