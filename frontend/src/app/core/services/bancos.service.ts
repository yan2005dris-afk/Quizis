import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';

export interface BancoPreguntas {
  bancoId: number;
  nombre: string;
  descripcion: string | null;
  createdAt: string;
  _count?: {
    preguntas: number;
  };
}

export interface Opcion {
  opcionId: number;
  texto: string;
  esCorrecta: boolean;
}

export interface Pregunta {
  preguntaId: number;
  texto: string;
  categoria: string | null;
  feedbackCorrecto: string | null;
  feedbackIncorrecto: string | null;
  nivel: number;
  monto: number | null;
  tiempoLimite: number;
  opciones: Opcion[];
}

export interface BancoPreguntasDetalle extends BancoPreguntas {
  preguntas: Pregunta[];
}

export interface BancosResponse {
  success: boolean;
  message: string;
  data: BancoPreguntas[];
}

export interface BancoDetalleResponse {
  success: boolean;
  message: string;
  data: BancoPreguntasDetalle;
}

@Injectable({
  providedIn: 'root',
})
export class BancosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/bancos`;

  createBanco(nombre: string, descripcion?: string, preguntas?: any[]): Observable<BancoPreguntas> {
    return this.http
      .post<{ success: boolean; message: string; data: BancoPreguntas }>(this.apiUrl, {
        nombre,
        descripcion,
        preguntas,
      })
      .pipe(map((res) => res.data));
  }

  crearPreguntas(
    bancoId: number,
    preguntas: any[],
  ): Observable<{ totalCreadas: number; bancoId: number }> {
    return this.http
      .post<{
        success: boolean;
        message: string;
        data: { totalCreadas: number; bancoId: number };
      }>(`${this.apiUrl}/${bancoId}/preguntas`, preguntas)
      .pipe(map((res) => res.data));
  }

  getAllBancos(): Observable<BancoPreguntas[]> {
    return this.http.get<BancosResponse>(this.apiUrl).pipe(map((res) => res.data));
  }

  getBancoById(id: number): Observable<BancoPreguntasDetalle> {
    return this.http.get<BancoDetalleResponse>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data));
  }

  updateBanco(
    id: number,
    data: { nombre?: string; descripcion?: string },
  ): Observable<BancoPreguntas> {
    return this.http
      .patch<{
        success: boolean;
        message: string;
        data: BancoPreguntas;
      }>(`${this.apiUrl}/${id}`, data)
      .pipe(map((res) => res.data));
  }

  updatePregunta(
    bancoId: number,
    preguntaId: number,
    pregunta: any,
  ): Observable<BancoPreguntasDetalle> {
    return this.http
      .patch<BancoDetalleResponse>(`${this.apiUrl}/${bancoId}/preguntas/${preguntaId}`, pregunta)
      .pipe(map((res) => res.data));
  }

  deletePregunta(bancoId: number, preguntaId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bancoId}/preguntas/${preguntaId}`);
  }
}
