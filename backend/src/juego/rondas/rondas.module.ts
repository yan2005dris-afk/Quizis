import { Module } from '@nestjs/common';
import { RondasService } from './application/rondas.service';
import { RondasController } from './interfaces/rondas.controller';
import { CreateRondaUseCase } from './application/use-cases/create-ronda.use-case';
import { HandleTimerExpirationUseCase } from './application/use-cases/handle-timer-expiration.use-case';
import { ReleaseQuestionUseCase } from './application/use-cases/release-question.use-case';
import { CacheModule } from '../../core/cache/cache.module';
import { RespuestasModule } from '../respuestas/respuestas.module';
import { RoomStateModule } from '../shared/room-state/room-state.module';

/**
 * Módulo de Rondas de Juego.
 *
 * Registra el controlador, el servicio fachada y los casos de uso
 * para la gestión de rondas. Cada ronda representa un intento
 * individual de un participante con preguntas aleatorias asignadas.
 */
@Module({
  imports: [CacheModule, RoomStateModule, RespuestasModule],
  controllers: [RondasController],
  providers: [
    RondasService,
    CreateRondaUseCase,
    HandleTimerExpirationUseCase,
    ReleaseQuestionUseCase,
  ],
  exports: [
    RondasService,
    ReleaseQuestionUseCase,
    HandleTimerExpirationUseCase,
  ],
})
export class RondasModule {}
