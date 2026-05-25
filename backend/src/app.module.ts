import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { GamesModule } from './games/games.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { VotosModule } from './juego/votos/votos.module';
import { SalasModule } from './juego/salas/salas.module';
import { HealthModule } from './infrastructure/health/health.module';
import { BancosModule } from './juego/bancos/bancos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    IdentityModule,
    GamesModule,
    WebsocketsModule,
    CacheModule,
    VotosModule,
    SalasModule,
    HealthModule,
    BancosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
