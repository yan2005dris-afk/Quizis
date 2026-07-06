import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { firstValueFrom } from 'rxjs';
import {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/rooms/game/play.types';
import { ToastService } from './toast.service';
import { GameApiService, SubmitAnswerResult, UpdateEstadoSalaResponse } from './game-api.service';

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
  /**
   * ID of the correct option (only present after the backend resolves the
   * answer). Used by the UI to highlight the correct option when the user
   * got it wrong.
   */
  opcionCorrectaId?: number;
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
  /**
   * ID of the correct option, included by the backend ONLY after a question
   * is answered. Used by the UI to highlight which option WAS correct when
   * the student got it wrong. Never sent during the active question
   * (`pregunta_liberada`) — that's why esCorrecta no longer leaks.
   */
  opcionCorrectaId?: number;
  feedback: string;
}

// Servicio singleton: Angular crea una sola instancia compartida por toda la app
@Injectable({ providedIn: 'root' })
export class GameSocketService {
  // HTTP API client (N1: 3 mutations migrated from WS to REST).
  private readonly api = inject(GameApiService);

  // Local nickname for REST calls (mirrors what `unirseASala` sends via WS).
  // Set by `unirseASala()` when joining a room.
  private localNickname: string | null = null;
  currentTokenCompartido: string | null = null;

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
  readonly salaFinalizadaWs = signal<boolean>(false);
  readonly tokenInvitacionRegenerado = signal<{
    tokenCompartidoNuevo: string;
    tokenInvitacion: string;
  } | null>(null);
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
    this.socket.on('connect', () => {
      this.conectado.set(true);
      if (this.currentTokenCompartido && this.localNickname) {
        this.socket?.emit('unirse_sala', {
          tokenCompartido: this.currentTokenCompartido,
          nombre: this.localNickname,
        });
      }
    });
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

    this.socket.on('tiempo_agotado', (data: { preguntaId: number; tokenCompartido: string }) => {
      // Validate preguntaId matches active question (prevents out-of-order overwrite
      // when timeout from old question overlaps with new pregunta_liberada).
      const activeId = this.preguntaActiva()?.preguntaId;
      if (data.preguntaId !== activeId) {
        console.warn('[GameSocketService] tiempo_agotado preguntaId mismatch — ignoring', {
          received: data.preguntaId,
          active: activeId,
        });
        return;
      }
      this.tiempoRestante.set(0);

      // Defensive fallback: if pregunta_respondida hasn't arrived yet for
      // this question, populate ultimoResultado with esCorrecta=false so
      // the feedback still renders. pregunta_respondida (which arrives
      // BEFORE tiempo_agotado in normal flow) will overwrite this with
      // the authoritative payload.
      const existing = this.ultimoResultado();
      if (!existing || existing.preguntaId !== data.preguntaId) {
        this.ultimoResultado.set({
          preguntaId: data.preguntaId,
          opcionId: -1, // unknown — overwritten when pregunta_respondida arrives
          esCorrecta: false,
          feedback: '',
        });
      }

      // Schedule local transition overlay — gives the user time to see the
      // feedback before the next-question overlay shows up. Backend no
      // longer manages this timing (see juego.gateway.ts onExpire).
      this.enTransicion.set(true);
      this.transicionSegundos.set(3);
      setTimeout(() => {
        this.enTransicion.set(false);
        this.transicionSegundos.set(null);
      }, 4_000);
    });

    this.socket.on('transicion_pregunta', (data: { segundos: number }) => {
      // Kept for backwards compatibility — backend no longer emits this,
      // but if a future server does emit it, honor it.
      this.enTransicion.set(true);
      this.transicionSegundos.set(data.segundos);
      setTimeout(
        () => {
          this.enTransicion.set(false);
          this.transicionSegundos.set(null);
        },
        (data.segundos + 1) * 1000,
      );
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

    this.socket.on(
      'voto_confirmado',
      (data: { preguntaId: number; votosRecibidos: number; totalRequeridos: number }) => {
        this.votantesConfirmados.set(data.votosRecibidos);
        this.totalVotantesRequeridos.set(data.totalRequeridos);
        this.esperandoConsenso.set(true);
      },
    );

    this.socket.on(
      'pregunta_respondida',
      (data: {
        preguntaId: number;
        opcionId: number;
        esCorrecta: boolean | null;
        opcionCorrectaId?: number | null;
        feedback: string | null;
      }) => {
        this.ultimoResultado.set({
          preguntaId: data.preguntaId,
          opcionId: data.opcionId,
          esCorrecta: data.esCorrecta ?? false,
          opcionCorrectaId: data.opcionCorrectaId ?? undefined,
          feedback: data.feedback ?? '',
        });
        this.esperandoConsenso.set(false);
        this.votantesConfirmados.set(0);
        this.totalVotantesRequeridos.set(0);
      },
    );

    this.socket.on('revoto_solicitado', (_data: { preguntaId: number; motivo: string }) => {
      this.revotoSolicitado.set(true);
      this.esperandoConsenso.set(false);
      this.votantesConfirmados.set(0);
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

    // Fired by FinalizeRoomUseCase → JuegoGateway when the admin
    // finalizes the sala. The game-session component observes
    // `salaFinalizadaWs` and navigates to the results screen on
    // transition to FINALIZADO. Without this event, students had to
    // refresh manually after the admin pressed "finalizar".
    this.socket.on('estado_sala_cambiado', (data: { tokenCompartido: string; estado: string }) => {
      if (data.estado === 'FINALIZADO') {
        this.salaHabilitada.set(false);
        this.salaFinalizadaWs.set(true);
      }
    });

    // Fired by RegenerateRoomTokenUseCase → JuegoGateway when the admin
    // regenerates the shareable token. Per design ("notify, don't
    // kick"), connected sockets stay joined under the OLD token —
    // this signal gives every connected client (including secondary
    // admin views, spectator displays) a chance to update the
    // shareable link they show without a manual refresh.
    this.socket.on(
      'token_regenerado',
      (data: {
        tokenCompartidoViejo: string;
        tokenCompartidoNuevo: string;
        tokenInvitacion: string;
      }) => {
        if (this.currentTokenCompartido === data.tokenCompartidoViejo) {
          this.currentTokenCompartido = data.tokenCompartidoNuevo;
        }
        this.tokenInvitacionRegenerado.set({
          tokenCompartidoNuevo: data.tokenCompartidoNuevo,
          tokenInvitacion: data.tokenInvitacion,
        });
      },
    );
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
    this.localNickname = nombre;
    this.currentTokenCompartido = tokenCompartido;
    this.socket?.emit('unirse_sala', { tokenCompartido, nombre });
  }

  // Envía un mensaje o sugerencia
  // N2: now uses REST (GameApiService). Returns a Promise.
  enviarMensaje(
    tokenCompartido: string,
    texto: string,
    tipo: 'mensaje' | 'sugerencia',
  ): Promise<unknown> {
    const nickname = this.localNickname;
    if (!nickname) return Promise.reject(new Error('No hay nickname local'));
    return firstValueFrom(this.api.enviarMensaje(tokenCompartido, { texto, tipo, nickname }));
  }

  // ——— Gameplay Actions ———

  // Liberar pregunta (Solo Host/Admin)
  // N1: now uses REST (GameApiService). Returns a Promise for parity with
  // the new REST contract. The WS 'pregunta_liberada' event was deprecated
  // and removed in backend.
  // SECURITY: only sends `preguntaId`. The backend loads the question + options
  // (with `esCorrecta`) from the DB; the WS broadcast is sanitized so the
  // correct flag never reaches clients.
  liberarPregunta(
    tokenCompartido: string,
    preguntaId: number,
  ): Promise<{ success: boolean; preguntaId: number }> {
    return firstValueFrom(this.api.liberarPregunta(tokenCompartido, preguntaId));
  }

  // Responder pregunta (Solo Estudiante)
  // N1: now uses REST. The REST endpoint validates nickname + role
  // server-side and returns the same SubmitAnswerResult shape.
  responderPregunta(payload: {
    tokenCompartido: string;
    rondaId: number;
    preguntaId: number;
    opcionId: number;
    comodinUsado?: string;
  }): Promise<SubmitAnswerResult> {
    const nickname = this.localNickname;
    if (!nickname) {
      return Promise.reject(new Error('No hay nickname local — debes unirte a una sala primero'));
    }
    return firstValueFrom(
      this.api.submitAnswer(payload.tokenCompartido, {
        rondaId: payload.rondaId,
        preguntaId: payload.preguntaId,
        opcionId: payload.opcionId,
        nickname,
        comodinUsado: payload.comodinUsado,
      }),
    );
  }

  // Emitir voto del público (Solo Observador)
  // N2: now uses REST. Note that REST derives participanteId from the JWT
  // user, so we no longer need the caller to pass it.
  emitirVoto(payload: {
    tokenCompartido: string;
    rondaId: number;
    preguntaId: number;
    opcionId: number;
  }): Promise<unknown> {
    return firstValueFrom(
      this.api.votar(payload.tokenCompartido, {
        rondaId: payload.rondaId,
        preguntaId: payload.preguntaId,
        opcionId: payload.opcionId,
      }),
    );
  }

  // Cambiar estado sala (Solo Admin)
  // N1: now uses REST. Returns a Promise for parity with the new REST contract.
  cambiarEstadoSala(
    tokenCompartido: string,
    habilitada: boolean,
  ): Promise<UpdateEstadoSalaResponse> {
    // The REST endpoint uses the full estado string; we map from the legacy
    // boolean (`habilitada`) by inferring the next state.
    return firstValueFrom(
      this.api.updateEstadoSala(tokenCompartido, {
        estado: habilitada ? 'EN_VIVO' : 'FINALIZADO',
      }),
    );
  }

  // Cambiar rol participante (Solo Admin)
  // N2: now uses REST (GameApiService). Returns a Promise.
  cambiarRolParticipante(
    tokenCompartido: string,
    nickname: string,
    nuevoRol: 'estudiante' | 'observador',
  ): Promise<unknown> {
    return firstValueFrom(this.api.cambiarRolParticipante(tokenCompartido, nickname, nuevoRol));
  }

  // Notificar uso de comodín para bloquearlo (Broadcast)
  // N2: now uses REST. opcionesEliminadas / preguntaId are no longer sent
  // to the server (the server uses its own state for 50_50 logic).
  bloquearComodin(
    tokenCompartido: string,
    tipoComodin: string,
    _opcionesEliminadas?: number[],
    _preguntaId?: number,
  ): Promise<unknown> {
    return firstValueFrom(this.api.bloquearComodin(tokenCompartido, tipoComodin));
  }

  // Activar comodín llamada (Solo Estudiante)
  // N2: now uses REST. The pregunta is fetched server-side.
  activarComodinLlamada(tokenCompartido: string, _pregunta: Pregunta): Promise<unknown> {
    return firstValueFrom(this.api.activarComodinLlamada(tokenCompartido));
  }

  // Enviar pista consultor (Solo Consultor)
  // N2: now uses REST.
  enviarPistaConsultor(
    tokenCompartido: string,
    preguntaId: number,
    pista: string,
  ): Promise<unknown> {
    return firstValueFrom(this.api.enviarPistaConsultor(tokenCompartido, { preguntaId, pista }));
  }

  // Resetear manualmente la bandera de re-voto (llamado por el componente después de procesar revoto_solicitado)
  resetRevoto(): void {
    this.revotoSolicitado.set(false);
  }

  // Reiniciar ronda (Solo Host/Admin)
  // N2: now uses REST. rondaActiva is no longer needed (server has it).
  reiniciarRonda(tokenCompartido: string, _rondaActiva: any): Promise<unknown> {
    return firstValueFrom(this.api.reiniciarRonda(tokenCompartido));
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
    this.localNickname = null;
    this.currentTokenCompartido = null;
  }
}
