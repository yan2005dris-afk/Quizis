import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Pregunta } from './game-socket.service';

/**
 * Body for POST /api/v1/salas/:salaId/respuestas.
 * Mirrors the backend's SubmitAnswerDto.
 */
export interface SubmitAnswerBody {
  rondaId: number;
  preguntaId: number;
  opcionId: number;
  nickname: string;
  comodinUsado?: string;
}

/**
 * Discriminated union response from submit-answer.
 * Mirrors the backend's SubmitAnswerResult.
 */
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

/**
 * Body for PATCH /api/v1/salas/by-token/:salaId/estado.
 */
export interface UpdateEstadoSalaBody {
  estado: 'BORRADOR' | 'ESPERANDO_ALUMNOS' | 'EN_VIVO' | 'FINALIZADO';
}

/**
 * Response from update-estado.
 */
export interface UpdateEstadoSalaResponse {
  salaId: number;
  estado: UpdateEstadoSalaBody['estado'];
}

/**
 * Body for POST /api/v1/salas/by-token/:salaId/preguntas/liberar.
 *
 * Security fix: the backend now loads the question + options (including
 * `esCorrecta`) from the DB by `preguntaId` — the client must NOT send the
 * full question, otherwise a student could read the answer from the broadcast
 * or a malicious client could mark any option as correct.
 */
export interface LiberarPreguntaBody {
  preguntaId: number;
}

/**
 * Typed HTTP client for the 3 mutations that were moved from WebSocket to
 * REST in N1 (sdd/quizis-rest-n1-mutations). Consumed by GameSocketService
 * which keeps the same public method signatures so consumers don't break.
 *
 * For realtime notifications (timer updates, vote counts, pregunta_respondida,
 * info_ronda, etc.) the WebSocket is still used.
 */
@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * POST /api/v1/salas/:salaId/respuestas — submit an answer for the active question.
   */
  submitAnswer(salaId: string, payload: SubmitAnswerBody): Observable<SubmitAnswerResult> {
    return this.http
      .post<SubmitAnswerResult>(`${this.apiUrl}/salas/${salaId}/respuestas`, payload)
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * PATCH /api/v1/salas/by-token/:salaId/estado — transition room state.
   */
  updateEstadoSala(
    salaId: string,
    payload: UpdateEstadoSalaBody,
  ): Observable<UpdateEstadoSalaResponse> {
    return this.http
      .patch<UpdateEstadoSalaResponse>(`${this.apiUrl}/salas/by-token/${salaId}/estado`, payload)
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/by-token/:salaId/preguntas/liberar — release a question.
   * Returns the preguntaId that was released (the backend loads the full
   * question from the DB and broadcasts it sanitized).
   */
  liberarPregunta(
    salaId: string,
    preguntaId: number,
  ): Observable<{ success: boolean; preguntaId: number }> {
    return this.http
      .post<{
        success: boolean;
        preguntaId: number;
      }>(`${this.apiUrl}/salas/by-token/${salaId}/preguntas/liberar`, { preguntaId })
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  // ──────────────────────────────────────────────────────────────────────
  // N2 endpoints (9 mutations)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/salas/by-token/:salaId/regenerar-token — admin action.
   */
  regenerarToken(salaId: string): Observable<{ tokenCompartido: string }> {
    return this.http
      .post<{
        tokenCompartido: string;
      }>(`${this.apiUrl}/salas/by-token/${salaId}/regenerar-token`, {})
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/by-token/:salaId/finalizar — admin finalizes the game.
   */
  finalizarPartida(salaId: string): Observable<{ totalParticipantes: number }> {
    return this.http
      .post<{ totalParticipantes: number }>(`${this.apiUrl}/salas/by-token/${salaId}/finalizar`, {})
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/by-token/:salaId/reiniciar-ronda — admin restarts the round.
   */
  reiniciarRonda(salaId: string): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/by-token/${salaId}/reiniciar-ronda`, {})
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * PATCH /api/v1/salas/by-token/:salaId/participantes/:nickname/rol
   */
  cambiarRolParticipante(
    salaId: string,
    nickname: string,
    rol: 'estudiante' | 'observador',
  ): Observable<unknown> {
    return this.http
      .patch<unknown>(`${this.apiUrl}/salas/by-token/${salaId}/participantes/${nickname}/rol`, {
        rol,
      })
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/:salaId/votos — audience vote.
   */
  votar(
    salaId: string,
    payload: { rondaId: number; preguntaId: number; opcionId: number },
  ): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/${salaId}/votos`, payload)
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/:salaId/mensajes — send chat message.
   * Backend throttles to 1/sec/user.
   */
  enviarMensaje(
    salaId: string,
    payload: { texto: string; tipo: 'mensaje' | 'sugerencia'; nickname: string },
  ): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/${salaId}/mensajes`, payload)
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/:salaId/comodines/:tipo/bloquear
   */
  bloquearComodin(salaId: string, tipo: string): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/${salaId}/comodines/${tipo}/bloquear`, {})
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/:salaId/comodines/llamada/activar
   */
  activarComodinLlamada(salaId: string): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/${salaId}/comodines/llamada/activar`, {})
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }

  /**
   * POST /api/v1/salas/:salaId/comodines/llamada/pista
   */
  enviarPistaConsultor(
    salaId: string,
    payload: { preguntaId: number; pista: string },
  ): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/salas/${salaId}/comodines/llamada/pista`, payload)
      .pipe(catchError((err: unknown) => this.toObservableError(err)));
  }
  /**
   * Normalize HttpClient errors into a typed shape so consumers (components,
   * toasts) can extract `err.error.message` reliably.
   */
  private toObservableError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      return throwError(() => ({
        status: err.status,
        message:
          (err.error as { message?: string | string[] })?.message ??
          err.message ??
          'Error desconocido',
      }));
    }
    return throwError(() => ({
      status: 0,
      message: 'Error de conexión',
    }));
  }
}
