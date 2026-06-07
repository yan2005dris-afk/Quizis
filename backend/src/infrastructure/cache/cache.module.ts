import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { MemoryCacheStore } from './memory-cache.store';
import { RedisModule } from '../database/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService, MemoryCacheStore],
  exports: [CacheService, MemoryCacheStore],
})
export class CacheModule {}
