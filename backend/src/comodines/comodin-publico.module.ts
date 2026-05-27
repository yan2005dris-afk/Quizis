import { Module } from '@nestjs/common';
import { ComodinPublicoService } from './comodin-publico.service';
import { ComodinPublicoController } from './comodin-publico.controller';
import { WebsocketsInfraModule } from '../infrastructure/websockets/websockets.module';
import { SalasModule } from '../juego/salas/salas.module';

@Module({
 imports: [WebsocketsInfraModule, SalasModule],
  controllers: [ComodinPublicoController],
  providers: [ComodinPublicoService],
})
export class ComodinPublicoModule {}