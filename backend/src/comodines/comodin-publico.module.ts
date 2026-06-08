import { Module } from '@nestjs/common';
import { ComodinPublicoService } from './comodin-publico.service';
import { ComodinPublicoController } from './comodin-publico.controller';
import { SalasModule } from '../juego/salas/salas.module';
import { VotosModule } from '../juego/votos/votos.module';
import { CacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [SalasModule, VotosModule, CacheModule],
  controllers: [ComodinPublicoController],
  providers: [ComodinPublicoService],
  exports: [ComodinPublicoService],
})
export class ComodinPublicoModule {}
