import { Module } from '@nestjs/common';
import { ComodinPublicoService } from './comodin-publico.service';
import { ComodinPublicoController } from './comodin-publico.controller';
import { WebsocketsInfraModule } from '../infrastructure/websockets/websockets.module';
import { SalasModule } from '../juego/salas/salas.module';
import { VotesCacheUseCase } from '../infrastructure/cache/use-cases/votes-cache.use-case';

@Module({
  imports: [WebsocketsInfraModule, SalasModule],
  controllers: [ComodinPublicoController],
  providers: [ComodinPublicoService, VotesCacheUseCase],
})
export class ComodinPublicoModule {}