import { Module } from '@nestjs/common';
import { RondasService } from './application/rondas.service';
import { RondasController } from './interfaces/rondas.controller';
import { CreateRondaUseCase } from './application/use-cases/create-ronda.use-case';
import { ReleaseQuestionWebsocket } from './infrastructure/websockets/release-question.websocket';
import { CacheModule } from '../../core/cache/cache.module';
import { SalasModule } from '../salas/salas.module';

/**
 * Módulo de Rondas de Juego.
 *
 * Registra el controlador, el servicio fachada y los casos de uso
 * para la gestión de rondas. Cada ronda representa un intento
 * individual de un participante con preguntas aleatorias asignadas.
 */
@Module({
  imports: [CacheModule, SalasModule],
  controllers: [RondasController],
  providers: [RondasService, CreateRondaUseCase, ReleaseQuestionWebsocket],
  exports: [RondasService, ReleaseQuestionWebsocket],
})
export class RondasModule {}
