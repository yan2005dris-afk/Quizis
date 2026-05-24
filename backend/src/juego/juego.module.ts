import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { JuegoGateway } from './gateways/juego.gateway';
import { RedisJuegoService } from './services/redis-juego.service';

@Module({
  providers: [
    {
      // Configuramos la conexión a Redis
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        });
      },
      inject: [ConfigService],
    },
    RedisJuegoService,
    JuegoGateway,
  ],
  exports: ['REDIS_CLIENT'],
})
export class JuegoModule {}
