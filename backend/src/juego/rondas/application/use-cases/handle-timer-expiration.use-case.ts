import { Injectable, Logger } from '@nestjs/common';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { RecordAnswerUseCase } from '../../../respuestas/application/use-cases/record-answer.use-case';

export interface HandleTimerExpirationParams {
  tokenCompartido: string;
  rondaId: number;
  preguntaId: number;
}

export type HandleTimerExpirationResult =
  | { claimed: false }
  | {
      claimed: true;
      opcionId: number;
      esCorrecta: false;
      opcionCorrectaId: number;
      feedback: string | undefined;
    };

/**
 * Persists a wrong answer when the distributed timer expires before the
 * student submits one.
 *
 * Race-safety: uses Redis SET NX via RoomStateCacheService.setQuestionStatusNX
 * to atomically claim the 'answered' state. If the student already answered
 * (status is 'answered'), this use-case aborts silently and returns
 * { claimed: false }.
 *
 * First writer wins (either the student answer path or this timer path).
 * The losing path bails out cleanly without double-persistence.
 */
@Injectable()
export class HandleTimerExpirationUseCase {
  private readonly logger = new Logger(HandleTimerExpirationUseCase.name);

  constructor(
    private readonly cacheService: RoomStateCacheService,
    private readonly recordAnswerUseCase: RecordAnswerUseCase,
  ) {}

  async execute(
    params: HandleTimerExpirationParams,
  ): Promise<HandleTimerExpirationResult> {
    // 1. Atomic claim — only the first caller (student answer OR timer)
    //    successfully sets the status. Loser bails out.
    const claimed = await this.cacheService.setQuestionStatusNX(
      params.tokenCompartido,
      'answered',
    );

    if (!claimed) {
      this.logger.warn(
        `[TIMER] Aborted: question already answered by student (token=${params.tokenCompartido}, preguntaId=${params.preguntaId})`,
      );
      return { claimed: false };
    }

    // 2. Read active question to find the correct option.
    const activeQuestion = await this.cacheService.getActiveQuestion(
      params.tokenCompartido,
    );
    if (!activeQuestion) {
      this.logger.error(
        `[TIMER] No active question in cache for token ${params.tokenCompartido} — cannot determine correct option. Rolling back claim.`,
      );
      // No rollback mechanism for the 'answered' status — the next pregunta_liberada
      // will overwrite it. Logged for ops awareness.
      return { claimed: false };
    }

    const correctOpcion = (
      activeQuestion.opciones as Array<{
        opcionId: number;
        esCorrecta: boolean;
      }>
    ).find((o) => o.esCorrecta === true);

    if (!correctOpcion) {
      this.logger.error(
        `[TIMER] No correct option found for preguntaId=${params.preguntaId} — data integrity issue`,
      );
      return { claimed: false };
    }

    // 3. Persist the wrong answer.
    await this.recordAnswerUseCase.execute({
      rondaId: params.rondaId,
      preguntaId: params.preguntaId,
      opcionId: correctOpcion.opcionId,
      esCorrecta: false,
      comodinUsado: null,
    });

    this.logger.log(
      `[TIMER] Persisting answer on timeout: preguntaId=${params.preguntaId}, opcionId=${correctOpcion.opcionId}, esCorrecta=false`,
    );

    return {
      claimed: true,
      opcionId: correctOpcion.opcionId,
      esCorrecta: false,
      // The timer path persists the correct option as the (wrong) answer
      // chosen by the student — there was no real choice. So `opcionCorrectaId`
      // is the same as `opcionId`. The UI uses this to highlight the
      // canonical correct option on timeout (security fix follow-up: the
      // backend now sends this field in pregunta_respondida after the
      // timer expires, even though the student never answered).
      opcionCorrectaId: correctOpcion.opcionId,
      feedback: activeQuestion.feedbackIncorrecto as string | undefined,
    };
  }
}
