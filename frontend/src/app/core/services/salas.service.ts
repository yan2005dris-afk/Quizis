import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalaResumen {
  salaId: number;
  nombre: string;
  estado: 'esperando' | 'jugando' | 'terminado';
  participantes: number;
  creadoEn: string;
}

export interface SalaDetalle {
  salaId: number;
  nombre: string;
  estado: string;
  limitePreguntas: number;
  tokenCompartido: string;
  creadoEn: string;
  participantes: {
    participanteId: number;
    nickname: string;
    rol: string;
    isOnline: boolean;
  }[];
  rondaActiva: {
    rondaId: number;
    numeroRonda: number;
    estado: string;
    fechaInicio: string | null;
    preguntaActualId?: number | null;
    preguntaActual?: any;
    historialPreguntas?: any[];
  } | null;
}

export interface ComodinSala {
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SalasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarTodas(): Observable<SalaResumen[]> {
    return this.http.get<SalaResumen[]>(`${this.apiUrl}/salas`);
  }

  obtenerPorId(idOrToken: number | string): Observable<SalaDetalle> {
    return this.http.get<SalaDetalle>(`${this.apiUrl}/salas/${idOrToken}`);
  }

  obtenerComodines(idOrToken: number | string): Observable<ComodinSala[]> {
    return this.http.get<ComodinSala[]>(`${this.apiUrl}/salas/${idOrToken}/comodines`);
  }
}
