import { Module } from '@nestjs/common';
import { ComodinIaService } from './comodin-ia/comodin-ia.service';
import { ComodinPublicoService } from './comodin-publico/comodin-publico.service';

@Module({
  providers: [ComodinIaService, ComodinPublicoService],
  exports: [ComodinIaService, ComodinPublicoService],
})
export class ComodinesModule {}
