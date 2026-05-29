import { Module } from '@nestjs/common';
import { ComodinPublicoService } from './comodin-publico.service';
import { ComodinPublicoController } from './comodin-publico.controller';
import { SalasModule } from '../juego/salas/salas.module';
import { CacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [SalasModule, CacheModule],
  controllers: [ComodinPublicoController],
  providers: [ComodinPublicoService],
  exports: [ComodinPublicoService],
})
export class ComodinPublicoModule {}
