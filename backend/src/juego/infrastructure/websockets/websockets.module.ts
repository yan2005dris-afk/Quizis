import { Module } from '@nestjs/common';
import { JuegoGateway } from './juego.gateway';
import { SocketMapService } from './socket-map.service';
import { DistributedTimerService } from './distributed-timer.service';
import { RoomBroadcastModule } from './room-broadcast.module';
import { SalasModule } from '../../salas/salas.module';
import { VotosModule } from '../../votos/votos.module';
import { ChatModule } from '../../chat/chat.module';
import { ComodinesModule } from '../../comodines/comodines.module';
import { RondasModule } from '../../rondas/rondas.module';

@Module({
  imports: [
    SalasModule,
    VotosModule,
    ChatModule,
    RoomBroadcastModule,
    ComodinesModule,
    RondasModule,
  ],
  providers: [JuegoGateway, SocketMapService, DistributedTimerService],
  exports: [JuegoGateway, RoomBroadcastModule],
})
export class WebsocketsInfraModule {}
