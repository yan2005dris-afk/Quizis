import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/rooms/game/play.types';
import { ToastService } from './toast.service';

// Representa una opción de respuesta individual dentro de una pregunta
export interface Opcion {
  opcionId: number;
  texto: string;
  letra: string;
  esCorrecta?: boolean;
}

// Representa la estructura completa de una pregunta tal como llega del servidor
export interface Pregunta {
  preguntaId: number;
  texto: string;
  opciones: Opcion[];
  nivel: number;
  feedbackCorrecto?: string;
  feedbackIncorrecto?: string;
}

// Resultado de una respuesta dada por el usuario a una pregunta
export interface RespuestaDada {
  opcionId: number;
  esCorrecta: boolean;
  feedback: string;
}

// Pregunta con el historial de respuesta del usuario (usada en el carrusel de historial)
export interface PreguntaHistorial extends Pregunta {
  respuestaDada?: RespuestaDada;
}

// Representa la distribución de votos del público por opción en una ronda activa
export interface VotosPublico {
  [letra: string]: number | undefined;
  total: number;
}

// Interfaz para el resultado de una respuesta procesada
export interface ResultRespuesta {
  preguntaId: number;
  opcionId: number;
  esCorrecta: boolean;
  feedback: string;
}

// Servicio singleton: Angular crea una sola instancia compartida por toda la app
@Injectable({ providedIn: 'root' })
export class GameSocketService {
  // Instancia de la conexión WebSocket; null hasta que se llame a conectar()
  private socket: Socket | null = null;

  // ——— RAF batching para votos del público ———
  // Evita sobrecargar el main thread cuando llegan muchos voto_recibido por segundo
  private _votosPublicoPending: VotosPublico | null = null;
  private _votosPublicoRafId: number | null = null;

  // Estado reactivo del juego — cualquier componente que los lea se actualiza automáticamente al cambiar
  readonly preguntaActiva = signal<Pregunta | null>(null);
  readonly tiempoRestante = signal<number | null>(null);
  readonly enTransicion = signal<boolean>(false);
  readonly transicionSegundos = signal<number | null>(null);
  readonly votosPublico = signal<VotosPublico | null>(null);
  readonly comodinBloqueado = signal<string[]>([]);
  readonly salaHabilitada = signal<boolean>(true);
  readonly conectado = signal<boolean>(false);

  // Estado para Comodín Llamada
  readonly llamadaActiva = signal<boolean>(false);
  readonly consultorAsignado = signal<string | null>(null);
  readonly preguntaConsultor = signal<Pregunta | null>(null);
  readonly pistaConsultor = signal<string | null>(null);

  // Resultado de la última respuesta enviada
  readonly ultimoResultado = signal<ResultRespuesta | null>(null);
  readonly ultimoComodinBloqueado = signal<any>(null);

  // IA suggestion broadcast to all participants (Bug 3 fix)
  readonly iaSugerenciaGlobal = signal<{ literal: string; explicacion: string } | null>(null);

  // Estado reactivo para el modo observador
  readonly mensajesChat = signal<ChatMessage[]>([]);
  readonly eventosSala = signal<SalaEvento[]>([]);
  readonly participantes = signal<Participante[]>([]);
  readonly infoRonda = signal<RondaInfo | null>(null);
  readonly rondaReiniciada = signal<any | null>(null);

  // 50/50 — survived round restarts (Bug 1 fix)
  readonly opcionesEliminadas = signal<number[]>([]);

  // Consenso de equipo — progreso de votos y estado de re-voto
  readonly votantesConfirmados = signal<number>(0);
  readonly totalVotantesRequeridos = signal<number>(0);
  readonly esperandoConsenso = signal<boolean>(false);
  readonly revotoSolicitado = signal<boolean>(false);

  private readonly toast = inject(ToastService);

  // Separado para poder mockearlo en tests sin depender de vi.mock
  protected createSocketConnection(url: string, token: string): Socket {
    return io(url, { auth: { token } });
  }

  // Abre la conexión al servidor WebSocket y registra los listeners de cada evento del juego
  conectar(url: string, token: string): void {
    this.desconectar();
    this.socket = this.createSocketConnection(url, token);

    this.setupConnectionListeners();
    this.setupPreguntaListeners();
    this.setupComodinListeners();
    this.setupComodinLlamadaListeners();
    this.setupComodinIAListener();
    this.setupSalaListeners();
    this.setupObserverListeners();
    this.setupRondaListener();
  }

  // ─── Connection lifecycle ───

  private setupConnectionListeners(): void {
    if (!this.socket) return;
    this.socket.on('connect', () => this.conectado.set(true));
    this.socket.on('disconnect', () => this.conectado.set(false));
  }

  // ─── Pregunta / Gameplay ───

  private setupPreguntaListeners(): void {
    if (!this.socket) return;

    this.socket.on('pregunta_liberada', (data: Pregunta) => {
      this.preguntaActiva.set(data);
      this._cancelPendingVoto();
      this.votosPublico.set(null);
      this.ultimoResultado.set(null);
      this.llamadaActiva.set(false);
      this.consultorAsignado.set(null);
      this.preguntaConsultor.set(null);
      this.pistaConsultor.set(null);
      this.iaSugerenciaGlobal.set(null);

      // Resetear transición al liberar nueva pregunta
      this.enTransicion.set(false);
      this.transicionSegundos.set(null);

      // Resetear estado de consenso al liberar nueva pregunta
      this.votantesConfirmados.set(0);
      this.totalVotantesRequeridos.set(0);
      this.esperandoConsenso.set(false);
      this.revotoSolicitado.set(false);

      this.infoRonda.update((info) => {
        if (!info) return info;
        return {
          ...info,
          ronda: info.ronda < info.totalRondas ? info.ronda + 1 : info.ronda,
        };
      });
    });

    // Recibe el tiempo restante de la pregunta activa (server-authoritative)
    this.socket.on('temporizador_actualizado', (data: number) => {
      this.tiempoRestante.set(data);
    });

    this.socket.on('tiempo_agotado', () => {
      this.tiempoRestante.set(0);
    });

    this.socket.on('transicion_pregunta', (data: { segundos: number }) => {
      this.enTransicion.set(true);
      this.transicionSegundos.set(data.segundos);
      setTimeout(() => {
        this.enTransicion.set(false);
        this.transicionSegundos.set(null);
      }, (data.segundos + 1) * 1000);
    });

    // Actualiza los votos del público en tiempo real (batchteado por RAF)
    this.socket.on('voto_recibido', (data: VotosPublico) => {
      this._votosPublicoPending = data;
      if (!this._votosPublicoRafId) {
        this._votosPublicoRafId = requestAnimationFrame(() => {
          this._votosPublicoRafId = null;
          if (this._votosPublicoPending !== null) {
            this.votosPublico.set(this._votosPublicoPending);
            this._votosPublicoPending = null;
          }
        });
      }
    });
  }

  // ─── Comodines (bloqueo, uso, estado inicial) ───

  private setupComodinListeners(): void {
    if (!this.socket) return;

    this.socket.on(
      'comodin_bloqueado',
      (data: { tipoComodin: string; opcionesEliminadas?: number[]; preguntaId?: number }) => {
        this.comodinBloqueado.update((list) =>
          list.includes(data.tipoComodin) ? list : [...list, data.tipoComodin],
        );
        this.ultimoComodinBloqueado.set(data);
      },
    );

    this.socket.on('comodin_usado', (data: { tipoComodin: string }) => {
      this.comodinBloqueado.update((list) =>
        list.includes(data.tipoComodin) ? list : [...list, data.tipoComodin],
      );
    });

    this.socket.on('comodines_bloqueados', (data: string[]) => {
      this.comodinBloqueado.set(data);
    });
  }

  // ─── Comodín Llamada ───

  private setupComodinLlamadaListeners(): void {
    if (!this.socket) return;

    this.socket.on('consultor_seleccionado', (data: { pregunta: Pregunta }) => {
      this.llamadaActiva.set(true);
      this.preguntaConsultor.set(data.pregunta);
    });

    this.socket.on(
      'comodin_llamada_iniciado',
      (data: { consultorId: string; consultorNombre: string }) => {
        this.llamadaActiva.set(true);
        this.consultorAsignado.set(data.consultorNombre);
      },
    );

    this.socket.on('pista_consultor_recibida', (data: { pista: string }) => {
      this.pistaConsultor.set(data.pista);
    });

    this.socket.on('comodin_llamada_error', (data: { message: string }) => {
      this.toast.show(
        data.message ?? 'No hay compañeros en línea disponibles',
        'warning',
        'Comodín Llamada',
      );
    });

    this.socket.on('enviar_pista_error', (data: { message: string }) => {
      this.toast.show(data.message ?? 'Error al enviar pista', 'warning', 'Consultor');
    });
  }

  // ─── Comodín IA ───

  private setupComodinIAListener(): void {
    if (!this.socket) return;

    this.socket.on(
      'ia_sugerencia_recibida',
      (data: { preguntaId: number; literal: string; explicacion: string }) => {
        this.iaSugerenciaGlobal.set({ literal: data.literal, explicacion: data.explicacion });
      },
    );
  }

  // ─── Estado de sala ───

  private setupSalaListeners(): void {
    if (!this.socket) return;

    this.socket.on('sala_estado_cambiado', (data: { habilitada: boolean }) => {
      this.salaHabilitada.set(data.habilitada);
    });

    this.socket.on('partida_finalizada', (_data: { totalParticipantes: number }) => {
      this.salaHabilitada.set(false);
    });
  }

  // ─── Observers (chat, participantes, eventos, info_ronda) ───

  private setupObserverListeners(): void {
    if (!this.socket) return;

    this.socket.on('mensaje_chat', (data: ChatMessage[]) => {
      this.mensajesChat.set(data);
    });
    this.socket.on('mensaje_chat_nuevo', (data: ChatMessage) => {
      this.mensajesChat.update((prev) => [...prev, data]);
    });

    this.socket.on('evento_sala', (data: SalaEvento[]) => {
      this.eventosSala.set(data);
    });

    this.socket.on('participantes', (data: Participante[]) => {
      console.log('[GameSocketService] Participantes actualizados:', data);
      this.participantes.set(data);
    });

    this.socket.on('info_ronda', (data: RondaInfo) => {
      this.infoRonda.set(data);
    });
  }

  // ─── Ronda (reinicio completo) ───

  private setupRondaListener(): void {
    if (!this.socket) return;

    this.socket.on('ronda_reiniciada', (data: any) => {
      console.log('[WS:ronda_reiniciada] Evento recibido', data);
      this._cancelPendingVoto();
      this.preguntaActiva.set(null);
      this.ultimoResultado.set(null);
      this.tiempoRestante.set(null);
      this.enTransicion.set(false);
      this.transicionSegundos.set(null);
      this.votosPublico.set(null);
      this.comodinBloqueado.set([]);
      this.llamadaActiva.set(false);
      this.consultorAsignado.set(null);
      this.preguntaConsultor.set(null);
      this.pistaConsultor.set(null);
      this.opcionesEliminadas.set([]);
      this.rondaReiniciada.set(data);
      if (data?.rondaActiva) {
        this.infoRonda.set({
          ronda: (() => {
            const idx = data.rondaActiva.historialPreguntas?.findIndex(
              (p: PreguntaHistorial) => p.preguntaId === data.rondaActiva!.preguntaActualId,
            );
            return idx !== undefined && idx >= 0 ? idx + 1 : 1;
          })(),
          totalRondas: data.limitePreguntas || data.rondaActiva.historialPreguntas?.length || 0,
          premio: '$0',
        });
      }
      console.log(
        '[WS:ronda_reiniciada] Signals reseteados. comodinBloqueado=',
        this.comodinBloqueado(),
      );
    });
  }

  // Cancela un RAF pendiente de votos — llamado antes de resetear el estado
  private _cancelPendingVoto(): void {
    if (this._votosPublicoRafId !== null) {
      cancelAnimationFrame(this._votosPublicoRafId);
      this._votosPublicoRafId = null;
    }
    this._votosPublicoPending = null;
  }

  // Permite inicializar el estado desde datos HTTP
  setEstadoInicial(data: {
    participantes: Participante[];
    infoRonda: RondaInfo | null;
    preguntaActiva?: Pregunta | null;
    salaHabilitada?: boolean;
  }): void {
    if (data.participantes && data.participantes.length > 0) {
      this.participantes.set(data.participantes);
    }
    if (data.infoRonda) {
      this.infoRonda.set(data.infoRonda);
    }
    if (data.preguntaActiva) {
      this.preguntaActiva.set(data.preguntaActiva);
    }
    if (data.salaHabilitada !== undefined) {
      this.salaHabilitada.set(data.salaHabilitada);
    }
  }

  // Se unte a una sala específica
  unirseASala(tokenCompartido: string, nombre: string): void {
    this.socket?.emit('unirse_sala', { tokenCompartido, nombre });
  }

  // Envía un mensaje o sugerencia
  enviarMensaje(texto: string, tipo: 'mensaje' | 'sugerencia'): void {
    this.socket?.emit('enviar_mensaje', { texto, tipo });
  }

  // ——— Gameplay Actions ———

  // Liberar pregunta (Solo Host/Admin)
  liberarPregunta(tokenCompartido: string, pregunta: Pregunta): void {
    this.socket?.emit('pregunta_liberada', { tokenCompartido, pregunta });
  }

  // Responder pregunta (Solo Estudiante)
  responderPregunta(payload: {
    tokenCompartido: string;
    rondaId: number;
    preguntaId: number;
    opcionId: number;
    comodinUsado?: string;
  }): void {
    this.socket?.emit('responder_pregunta', payload);
  }

  // Emitir voto del público (Solo Observador)
  emitirVoto(payload: {
    salaId: number;
    rondaId: number;
    tokenCompartido: string;
    preguntaId: number;
    participanteId: number;
    opcionId: number;
  }): void {
    this.socket?.emit('audience:vote', payload);
  }

  // Cambiar estado sala (Solo Admin)
  cambiarEstadoSala(tokenCompartido: string, habilitada: boolean): void {
    this.socket?.emit('cambiar_estado_sala', { tokenCompartido, habilitada });
  }

  // Cambiar rol participante (Solo Admin)
  // Retorna una promesa que resuelve con la respuesta del server (éxito o error)
  cambiarRolParticipante(
    tokenCompartido: string,
    nickname: string,
    nuevoRol: 'estudiante' | 'observador',
  ): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Socket no conectado' });
        return;
      }
      this.socket.emit(
        'cambiar_rol_participante',
        { tokenCompartido, nickname, nuevoRol },
        (res: any) => {
          resolve(res);
        },
      );
    });
  }

  // Notificar uso de comodín para bloquearlo (Broadcast)
  bloquearComodin(
    tokenCompartido: string,
    tipoComodin: string,
    opcionesEliminadas?: number[],
    preguntaId?: number,
  ): void {
    this.socket?.emit('comodin_bloqueado', {
      tokenCompartido,
      tipoComodin,
      opcionesEliminadas,
      preguntaId,
    });
  }

  // Activar comodín llamada (Solo Estudiante)
  activarComodinLlamada(tokenCompartido: string, pregunta: Pregunta): void {
    this.socket?.emit('activar_comodin_llamada', { tokenCompartido, pregunta });
  }

  // Enviar pista consultor (Solo Consultor)
  enviarPistaConsultor(tokenCompartido: string, preguntaId: number, pista: string): void {
    this.socket?.emit('enviar_pista_consultor', { tokenCompartido, preguntaId, pista });
  }

  // Resetear manualmente la bandera de re-voto (llamado por el componente después de procesar revoto_solicitado)
  resetRevoto(): void {
    this.revotoSolicitado.set(false);
  }

  // Reiniciar ronda (Solo Host/Admin)
  reiniciarRonda(tokenCompartido: string, rondaActiva: any): void {
    console.log('[WS:emit:reiniciar_ronda] Emitiendo a token=', tokenCompartido);
    this.socket?.emit('reiniciar_ronda', { tokenCompartido, rondaActiva });
  }

  // Cierra la conexión limpiamente
  desconectar(): void {
    this._cancelPendingVoto();
    if (this.socket) {
      if (typeof this.socket.removeAllListeners === 'function') {
        this.socket.removeAllListeners();
      }
      this.socket.disconnect();
    }
    this.socket = null;
    this.conectado.set(false);
    this.rondaReiniciada.set(null);
  }
}
