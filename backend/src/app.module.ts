import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/prisma/prisma.module';
import { RedisModule } from './infrastructure/database/redis/redis.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JuegoModule } from './juego/juego.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { HealthModule } from './infrastructure/health/health.module';
import { WebsocketsInfraModule } from './infrastructure/websockets/websockets.module';
import { VotosModule } from './juego/votos/votos.module';
import { SalasModule } from './juego/salas/salas.module';
import { RondasModule } from './juego/rondas/rondas.module';
import { ComodinPublicoModule } from './comodines/comodin-publico.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    RedisModule,
    IdentityModule,
    JuegoModule,
    CacheModule,
    HealthModule,
    WebsocketsInfraModule,
    VotosModule,
    SalasModule,
    RondasModule,
    ComodinPublicoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}