import { Module } from '@nestjs/common';
import { SalasService } from './salas.service';
import { SalasController } from './salas.controller';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';

/**
 * Módulo de Salas de Juego.
 *
 * Registra el controlador, el servicio fachada y los casos de uso
 * necesarios para la gestión completa del ciclo de vida de una sala:
 * creación con PIN único y transición de estados.
 */
@Module({
  controllers: [SalasController],
  providers: [SalasService, CreateSalaUseCase, UpdateEstadoSalaUseCase],
})
export class SalasModule {}
