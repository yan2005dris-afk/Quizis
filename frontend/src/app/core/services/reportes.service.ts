import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Espejo del ReportDataDto del backend */
export interface ReportDataDto {
  salaId: number;
  nombreSala: string;
  docente: string;
  fechaCreacion: Date;
  rondas: {
    numeroRonda: number;
    participanteNickname: string;
    totalPreguntas: number;
    correctas: number;
    incorrectas: number;
    porcentajeAcierto: number;
    comodinesUsados: string[];
    preguntas: {
      numero: number;
      texto: string;
      respuestaElegida: string;
      esCorrecta: boolean;
      comodinUsado?: string;
      porcentajeVotosPublico?: number;
    }[];
  }[];
  resumenGeneral: {
    totalRondas: number;
    participantes: string[];
    totalPreguntasRespondidas: number;
    totalCorrectas: number;
    totalIncorrectas: number;
    porcentajeGlobal: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Llama a POST /reportes/generar con el salaId.
   * Requiere JWT en el interceptor de autenticación.
   */
  generarReporte(salaId: number): Observable<ReportDataDto> {
    return this.http.post<ReportDataDto>(`${this.apiUrl}/reportes/generar`, { salaId });
  }

  /**
   * Fetches pre-generated report data for a room.
   * Requires JWT in the interceptor of authentication.
   */
  obtenerEstadisticas(salaId: number): Observable<ReportDataDto> {
    return this.http.get<ReportDataDto>(`${this.apiUrl}/reportes/${salaId}`);
  }
}
