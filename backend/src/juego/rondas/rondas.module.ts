import { Module } from '@nestjs/common';
import { RondasService } from './rondas.service';
import { RondasController } from './rondas.controller';
import { CreateRondaUseCase } from './use-cases/create-ronda.use-case';
import { ReleaseQuestionWebsocket } from './websockets/release-question.websocket';
import { CacheModule } from '../../infrastructure/cache/cache.module';
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
