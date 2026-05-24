import { Module } from '@nestjs/common';
import { ComodinLlamadaService } from './comodin-llamada/comodin-llamada.service';
import { ComodinIaService } from './comodin-ia/comodin-ia.service';
import { ComodinPublicoService } from './comodin-publico/comodin-publico.service';

// Importa los controladores que creamos
import { ComodinIaController } from './comodin-ia/comodin-ia.controller';
// Si tienes controladores para llamada o publico, impórtalos aquí también:
// import { ComodinLlamadaController } from './comodin-llamada/comodin-llamada.controller';
// import { ComodinPublicoController } from './comodin-publico/comodin-publico.controller';

@Module({
  // Registra los controladores aquí para que respondan a las rutas HTTP
  controllers: [
    ComodinIaController,
    // ComodinLlamadaController,
    // ComodinPublicoController
  ],
  // Los proveedores (servicios) ya los tenías bien
  providers: [ComodinLlamadaService, ComodinIaService, ComodinPublicoService],
  // Exporta los servicios por si otros módulos los necesitan
  exports: [ComodinLlamadaService, ComodinIaService, ComodinPublicoService],
})
export class ComodinesModule {}
