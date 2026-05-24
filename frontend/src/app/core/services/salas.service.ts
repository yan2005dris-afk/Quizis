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
  } | null;
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

  obtenerPorId(id: number): Observable<SalaDetalle> {
    return this.http.get<SalaDetalle>(`${this.apiUrl}/salas/${id}`);
  }
}
