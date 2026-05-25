import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { JuegoModule } from './juego/juego.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { HealthModule } from './infrastructure/health/health.module';
import { WebsocketsInfraModule } from './infrastructure/websockets/websockets.module';

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
    CacheModule,
    HealthModule,
    WebsocketsInfraModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
