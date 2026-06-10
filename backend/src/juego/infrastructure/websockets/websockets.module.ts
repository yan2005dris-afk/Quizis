import { Module } from '@nestjs/common';
import { JuegoGateway } from './juego.gateway';
import { SalasModule } from '../../salas/salas.module';
import { VotosModule } from '../../votos/votos.module';
import { ChatModule } from '../../chat/chat.module';
import { ComodinesModule } from '../../comodines/comodines.module';
import { RondasModule } from '../../rondas/rondas.module';

@Module({
  imports: [SalasModule, VotosModule, ChatModule, ComodinesModule, RondasModule],
  providers: [JuegoGateway],
  exports: [JuegoGateway],
})
export class WebsocketsInfraModule {}
