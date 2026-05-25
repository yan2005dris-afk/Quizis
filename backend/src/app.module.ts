import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JuegoModule } from './juego/juego.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { SalasModule } from './juego/salas/salas.module';
import { HealthModule } from './infrastructure/health/health.module';
import { BancosModule } from './juego/bancos/bancos.module';
import { VotosModule } from './games/votos/votos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    IdentityModule,
    JuegoModule,
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
