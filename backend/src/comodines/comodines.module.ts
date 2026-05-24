import { Module } from '@nestjs/common';
import { ComodinLlamadaService } from './comodin-llamada/comodin-llamada.service';
import { ComodinIaService } from './comodin-ia/comodin-ia.service';
import { ComodinPublicoService } from './comodin-publico/comodin-publico.service';
import { ComodinIaController } from './comodin-ia/comodin-ia.controller';
@Module({
  controllers: [ComodinIaController], // <--- Regístralo aquí
  providers: [ComodinLlamadaService, ComodinIaService, ComodinPublicoService],
  exports: [ComodinIaService],
})
export class ComodinesModule {}
