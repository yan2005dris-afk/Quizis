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
 */
export interface LiberarPreguntaBody {
  pregunta: Pregunta;
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
   */
  liberarPregunta(salaId: string, payload: LiberarPreguntaBody): Observable<Pregunta> {
    return this.http
      .post<Pregunta>(`${this.apiUrl}/salas/by-token/${salaId}/preguntas/liberar`, payload)
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
