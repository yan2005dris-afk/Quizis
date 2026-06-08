import { Module } from '@nestjs/common';
import { BancosModule } from './bancos/bancos.module';
import { SalasModule } from './salas/salas.module';
import { VotosModule } from './votos/votos.module';
import { ComodinesModule } from './comodines/comodines.module';
import { ChatModule } from './chat/chat.module';
import { RondasModule } from './rondas/rondas.module';

@Module({
  imports: [
    BancosModule,
    SalasModule,
    VotosModule,
    ComodinesModule,
    ChatModule,
    RondasModule,
  ],
  exports: [
    SalasModule,
    VotosModule,
    ComodinesModule,
    ChatModule,
    RondasModule,
  ],
})
export class JuegoModule {}
