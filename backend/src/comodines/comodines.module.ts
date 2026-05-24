import { Module } from '@nestjs/common';
import { ComodinLlamadaService } from './comodin-llamada/comodin-llamada.service';
import { ComodinIaService } from './comodin-ia/comodin-ia.service';
import { ComodinPublicoService } from './comodin-publico/comodin-publico.service';

@Module({
  providers: [ComodinLlamadaService, ComodinIaService, ComodinPublicoService],
  exports: [ComodinLlamadaService, ComodinIaService, ComodinPublicoService]
})
export class ComodinesModule {}
