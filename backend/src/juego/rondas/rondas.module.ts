import { Module } from '@nestjs/common';
import { RondasService } from './rondas.service';
import { RondasController } from './rondas.controller';
import { CreateRondaUseCase } from './use-cases/create-ronda.use-case';

/**
 * Módulo de Rondas de Juego.
 *
 * Registra el controlador, el servicio fachada y los casos de uso
 * para la gestión de rondas. Cada ronda representa un intento
 * individual de un participante con preguntas aleatorias asignadas.
 */
@Module({
  controllers: [RondasController],
  providers: [RondasService, CreateRondaUseCase],
})
export class RondasModule {}
