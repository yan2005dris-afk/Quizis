import { Module } from '@nestjs/common';
import { ComodinPublicoService } from './comodin-publico.service';
import { ComodinPublicoController } from './comodin-publico.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { SalasModule } from '../juego/salas/salas.module';

@Module({
  imports: [WebsocketsModule, SalasModule],
  controllers: [ComodinPublicoController],
  providers: [ComodinPublicoService],
})
export class ComodinPublicoModule {}