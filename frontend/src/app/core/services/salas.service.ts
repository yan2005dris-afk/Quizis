import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { EstadoSala } from '../constants/estados.constants';
import { ESTADOS_SALA } from '../constants/estados.constants';

/** Tipo para el listado de salas (backend mapea los valores) */
export type EstadoSalaListado = 'borrador' | 'esperando' | 'jugando' | 'terminado';

export interface SalaResumen {
  salaId: number;
  nombre: string;
  estado: EstadoSalaListado;
  participantes: number;
  creadoEn: string;
}

export { EstadoSala, ESTADOS_SALA };

export interface SalaDetalle {
  salaId: number;
  nombre: string;
  estado: EstadoSala;
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
    historialPreguntas: any[];
  } | null;
}

export interface ComodinSala {
  comodinId: number;
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
}

export interface CreateSalaPayload {
  bancoId: number;
  nombre: string;
  limitePreguntas?: number;
  duracionTokenHoras?: number;
  maxEstudiantes?: number;
}

export interface SalaCreada {
  salaId: number;
  nombre: string;
  estado: EstadoSala;
  tokenCompartido: string;
  tokenInvitacion: string;
  tokenExpiraEn: string | null;
  invitacionUrl: string;
  limitePreguntas: number;
  preguntasSeleccionadas: number[];
  totalPreguntasBanco: number;
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

  crearSala(payload: CreateSalaPayload): Observable<SalaCreada> {
    return this.http.post<SalaCreada>(`${this.apiUrl}/salas`, payload);
  }

  updateConfiguracion(
    salaId: number,
    data: {
      nombre?: string;
      limitePreguntas?: number;
      maxEstudiantes?: number;
      comodines?: { comodinId: number; activo: boolean }[];
    },
  ): Observable<SalaDetalle> {
    return this.http.patch<SalaDetalle>(`${this.apiUrl}/salas/${salaId}/configuracion`, data);
  }

  validateToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/salas/join/${token}`);
  }

  join(token: string, nickname: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salas/join`, { token, nickname });
  }

  updateEstado(salaId: number, data: { estado: EstadoSala }): Observable<SalaDetalle> {
    return this.http.patch<SalaDetalle>(`${this.apiUrl}/salas/${salaId}/estado`, data);
  }

  regenerarToken(salaId: number): Observable<{
    success: boolean;
    tokenCompartido: string;
    tokenInvitacion: string;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      tokenCompartido: string;
      tokenInvitacion: string;
      message: string;
    }>(`${this.apiUrl}/salas/${salaId}/regenerar-token`, {});
  }

  getLinkInvitacion(salaId: number): Observable<{ tokenInvitacion: string }> {
    return this.http.get<{ tokenInvitacion: string }>(
      `${this.apiUrl}/salas/${salaId}/link-invitacion`,
    );
  }

  finalizarSala(salaId: number): Observable<{ success: boolean; totalParticipantes: number }> {
    return this.http.post<{ success: boolean; totalParticipantes: number }>(
      `${this.apiUrl}/salas/${salaId}/finalizar`,
      {},
    );
  }

  reiniciarRonda(
    salaId: number,
  ): Observable<{ estado: EstadoSala; rondaActiva: SalaDetalle['rondaActiva'] }> {
    return this.http.post<{ estado: EstadoSala; rondaActiva: SalaDetalle['rondaActiva'] }>(
      `${this.apiUrl}/salas/${salaId}/reiniciar-ronda`,
      {},
    );
  }

  reactivarSala(salaId: number): Observable<{
    success: boolean;
    estado: EstadoSala;
    tokenCompartido: string;
    tokenInvitacion: string;
    message: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/salas/${salaId}/reactivar`, {});
  }

  solicitarSugerenciaIa(preguntaId: number): Observable<{ literal: string; explicacion: string }> {
    return this.http.post<{ literal: string; explicacion: string }>(
      `${this.apiUrl}/comodines/ia/sugerencia`,
      { preguntaId },
    );
  }

  usarComodin5050(preguntaId: number): Observable<{ opcionesEliminadas: number[] }> {
    return this.http.post<{ opcionesEliminadas: number[] }>(`${this.apiUrl}/comodines/50-50`, {
      preguntaId,
    });
  }
}
