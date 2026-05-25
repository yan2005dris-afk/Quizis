import { Global, Module } from '@nestjs/common';
import { JuegoGateway } from './juego.gateway';
import { JuegoModule } from '../../juego/juego.module';
import { SalasModule } from '../../juego/salas/salas.module';

@Global()
@Module({
  imports: [JuegoModule, SalasModule],
  providers: [JuegoGateway],
  exports: [JuegoGateway],
})
export class WebsocketsInfraModule {}
