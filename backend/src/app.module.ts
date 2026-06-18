import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/prisma/prisma.module';
import { RedisModule } from './core/database/redis/redis.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JuegoModule } from './juego/juego.module';
import { CacheModule } from './core/cache/cache.module';
import { HealthModule } from './core/health/health.module';
import { WebsocketsInfraModule } from './juego/infrastructure/websockets/websockets.module';
import { VotosModule } from './juego/votos/votos.module';
import { SalasModule } from './juego/salas/salas.module';
import { ReportesModule } from './juego/reportes/reportes.module';
import { RondasModule } from './juego/rondas/rondas.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
    ReportesModule,
    RondasModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
