import { Module } from '@nestjs/common';
import { CacheModule } from '../infrastructure/cache/cache.module';
import { JuegoGateway } from './gateways/juego.gateway';
import { RedisJuegoService } from './services/redis-juego.service';

@Module({
  imports: [CacheModule],
  providers: [RedisJuegoService, JuegoGateway],
})
export class JuegoModule {}
