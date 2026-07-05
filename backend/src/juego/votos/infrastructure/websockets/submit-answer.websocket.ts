import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { RecordAnswerUseCase } from '../../../respuestas/application/use-cases/record-answer.use-case';
import { ConsensusCacheService } from '../cache/consensus-cache.service';
import { EvaluateConsensusWebsocket } from './evaluate-consensus.websocket';
import { GameEvents } from '../../../../core/common/events/game-events.types';

export interface AnswerPayload {
  tokenCompartido: string;
  rondaId: number;
  preguntaId: number;
  opcionId: number;
  nickname: string;
  comodinUsado?: string;
}

export type SubmitAnswerResult =
  | { status: 'pending'; votosRecibidos: number; totalRequeridos: number }
  | {
      status: 'majority';
      winningOpcionId: number;
      esCorrecta: boolean;
      feedback: string;
    }
  | {
      status: 'single';
      winningOpcionId: number;
      esCorrecta: boolean;
      feedback: string;
    }
  | { status: 'no-majority' }
  | { status: 'race-lost' };

@Injectable()
export class SubmitAnswerWebsocket {
  private readonly logger = new Logger(SubmitAnswerWebsocket.name);

  constructor(
    private readonly cacheService: RoomStateCacheService,
    private readonly recordAnswerUseCase: RecordAnswerUseCase,
    private readonly consensusCache: ConsensusCacheService,
    private readonly evaluateConsensus: EvaluateConsensusWebsocket,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: AnswerPayload): Promise<SubmitAnswerResult> {
    this.logger.log(
      `Procesando respuesta para sala ${payload.tokenCompartido}, pregunta ${payload.preguntaId}`,
    );

    // 1. Obtener la pregunta activa de Redis para validación ultra-rápida
    const activeQuestion = await this.cacheService.getActiveQuestion(
      payload.tokenCompartido,
    );

    if (!activeQuestion || activeQuestion.preguntaId !== payload.preguntaId) {
      throw new BadRequestException(
        'La pregunta no está activa o el ID no coincide.',
      );
    }

    // 2. Verificar estado en Redis
    const status = await this.cacheService.getQuestionStatus(
      payload.tokenCompartido,
    );
    if (status === 'answered') {
      throw new BadRequestException('Esta pregunta ya fue respondida.');
    }

    // 3. Validar si la opción pertenece a esta pregunta
    const opcion = activeQuestion.opciones.find(
      (o: any) => o.opcionId === payload.opcionId,
    );
    if (!opcion) {
      throw new NotFoundException(
        'La opción seleccionada no pertenece a esta pregunta.',
      );
    }

    // 4. Registrar voto en el cache de consenso
    await this.consensusCache.recordVote(
      payload.tokenCompartido,
      payload.preguntaId,
      payload.nickname,
      payload.opcionId,
    );

    // 5. Evaluar consenso
    const result = await this.evaluateConsensus.execute(
      payload.tokenCompartido,
      payload.preguntaId,
    );

    // 5b. Emitir evento de consenso evaluado para que el gateway
    //     frene el timer y notifique a TODOS los clientes vía WS.
    this.eventEmitter.emit(GameEvents.VOTOS.CONSENSO_EVALUADO, {
      tokenCompartido: payload.tokenCompartido,
      preguntaId: payload.preguntaId,
      result,
    });

    // 6. Actuar según el resultado del consenso
    switch (result.type) {
      case 'pending': {
        this.logger.log(
          `Voto registrado, pendiente consenso: ${result.votosRecibidos}/${result.totalRequeridos}`,
        );
        return {
          status: 'pending',
          votosRecibidos: result.votosRecibidos,
          totalRequeridos: result.totalRequeridos,
        };
      }

      case 'single':
      case 'majority': {
        const winningOpcionId = result.winningOpcionId;
        const winningOpcion = activeQuestion.opciones.find(
          (o: any) => o.opcionId === winningOpcionId,
        );
        const esCorrecta = winningOpcion?.esCorrecta ?? false;
        const feedback = esCorrecta
          ? activeQuestion.feedbackCorrecto
          : activeQuestion.feedbackIncorrecto;

        // Atomic claim: if the timer already won the race, bail out.
        // NX guard prevents double-persistence.
        const claimed = await this.cacheService.setQuestionStatusNX(
          payload.tokenCompartido,
          'answered',
        );
        if (!claimed) {
          this.logger.log(
            `[SUBMIT] Question already in answered state — likely won by timer. Aborting.`,
          );
          return { status: 'race-lost' };
        }

        // Persistir en Base de Datos (only if we won the race)
        try {
          await this.recordAnswerUseCase.execute({
            rondaId: payload.rondaId,
            preguntaId: payload.preguntaId,
            opcionId: winningOpcionId,
            esCorrecta,
            comodinUsado: payload.comodinUsado ?? null,
          });
        } catch (persistError) {
          // Rollback the NX claim so future submissions are not blocked
          await this.cacheService.setQuestionStatus(
            payload.tokenCompartido,
            'released',
          );
          this.logger.error(
            `[SUBMIT] Persistence failed after NX claim — rolled back status: ${persistError}`,
          );
          throw persistError;
        }

        this.logger.log(
          `Consenso resuelto (${result.type}): opcionId=${winningOpcionId}, esCorrecta=${esCorrecta}`,
        );

        return {
          status: result.type,
          winningOpcionId,
          esCorrecta,
          feedback,
        };
      }

      case 'no-majority': {
        // Limpiar votos para permitir revoto
        await this.consensusCache.clearConsensus(
          payload.tokenCompartido,
          payload.preguntaId,
        );

        this.logger.log(
          `Sin mayoría para pregunta ${payload.preguntaId} en sala ${payload.tokenCompartido}, se solicita revoto`,
        );

        return { status: 'no-majority' };
      }
    }
  }
}
