import { Module } from '@nestjs/common';
import { BancosModule } from './bancos/bancos.module';
import { SalasModule } from './salas/salas.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { VotosModule } from './votos/votos.module';
import { ComodinesModule } from './comodines/comodines.module';

@Module({
  imports: [
    BancosModule,
    SalasModule,
    WebsocketsModule,
    VotosModule,
    ComodinesModule,
  ],
  exports: [WebsocketsModule],
})
export class JuegoModule {}
