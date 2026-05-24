import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { GamesModule } from './games/games.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { VotosModule } from './juego/votos/votos.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}