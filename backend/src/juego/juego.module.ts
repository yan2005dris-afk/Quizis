import { Module } from '@nestjs/common';
import { CacheModule } from '../infrastructure/cache/cache.module';
import { JuegoGateway } from './websockets/juego.gateway';
import { RedisJuegoService } from './websockets/redis-juego.service';
import { QuizGateway } from 'src/juego/websockets/quiz.gateway';

@Module({
  imports: [CacheModule],
  providers: [RedisJuegoService, JuegoGateway, QuizGateway],
})
export class JuegoModule {}
