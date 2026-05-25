import { Global, Module } from '@nestjs/common';
import { JuegoGateway } from './juego.gateway';
import { JuegoModule } from '../../juego/juego.module';
import { forwardRef } from '@nestjs/common';

@Global()
@Module({
  imports: [forwardRef(() => JuegoModule)],
  providers: [JuegoGateway],
  exports: [JuegoGateway],
})
export class WebsocketsInfraModule {}
