import { Module } from '@nestjs/common';
import { JuegoGateway } from './juego.gateway';
import { SalasModule } from '../../juego/salas/salas.module';
import { VotosModule } from '../../juego/votos/votos.module';
import { ChatModule } from '../../juego/chat/chat.module';
import { ComodinesModule } from '../../juego/comodines/comodines.module';
import { RondasModule } from '../../juego/rondas/rondas.module';

@Module({
  imports: [SalasModule, VotosModule, ChatModule, ComodinesModule, RondasModule],
  providers: [JuegoGateway],
  exports: [JuegoGateway],
})
export class WebsocketsInfraModule {}
