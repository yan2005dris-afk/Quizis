import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, SalaEvento, Participante, RondaInfo } from '../../features/room/room.types';

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
  readonly votosPublico = signal<VotosPublico | null>(null);
  readonly comodinBloqueado = signal<string[]>([]);
  readonly salaHabilitada = signal<boolean>(true);
  readonly conectado = signal<boolean>(false);

  // Resultado de la última respuesta enviada
  readonly ultimoResultado = signal<ResultRespuesta | null>(null);

  // Estado reactivo para el modo observador
  readonly mensajesChat = signal<ChatMessage[]>([]);
  readonly eventosSala = signal<SalaEvento[]>([]);
  readonly participantes = signal<Participante[]>([]);
  readonly infoRonda = signal<RondaInfo | null>(null);
  readonly rondaReiniciada = signal<any | null>(null);

  // Separado para poder mockearlo en tests sin depender de vi.mock
  protected createSocketConnection(url: string, token: string): Socket {
    return io(url, { auth: { token } });
  }

  // Abre la conexión al servidor WebSocket y registra los listeners de cada evento del juego
  conectar(url: string, token: string): void {
    this.desconectar();
    this.socket = this.createSocketConnection(url, token);

    // Actualiza el estado de conexión según el ciclo de vida del socket
    this.socket.on('connect', () => this.conectado.set(true));
    this.socket.on('disconnect', () => this.conectado.set(false));

    // Al llegar una nueva pregunta, la almacena y limpia los votos/resultados anteriores
    this.socket.on('pregunta_liberada', (data: Pregunta) => {
      this.preguntaActiva.set(data);
      this._cancelPendingVoto(); // No aplicar votos viejos después de liberar
      this.votosPublico.set(null);
      this.ultimoResultado.set(null);
    });

    // Recibe el tiempo restante de la pregunta activa
    this.socket.on('temporizador_actualizado', (data: number) => {
      this.tiempoRestante.set(data);
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

    // Acumula comodines bloqueados en tiempo real
    this.socket.on('comodin_bloqueado', (data: { tipoComodin: string }) => {
      this.comodinBloqueado.update((list) =>
        list.includes(data.tipoComodin) ? list : [...list, data.tipoComodin],
      );
    });

    // Estado inicial de comodines bloqueados al unirse (para quien entra tarde)
    this.socket.on('comodines_bloqueados', (data: string[]) => {
      this.comodinBloqueado.set(data);
    });

    // Recibe cambios en el estado de habilitación de la sala
    this.socket.on('sala_estado_cambiado', (data: { habilitada: boolean }) => {
      this.salaHabilitada.set(data.habilitada);
    });

    // Recibe el resultado de una respuesta procesada (broadcast)
    this.socket.on('pregunta_respondida', (data: ResultRespuesta) => {
      this.ultimoResultado.set(data);
    });

    // ——— Observers ———
    this.socket.on('mensaje_chat', (data: ChatMessage[]) => {
      this.mensajesChat.set(data);
    });

    this.socket.on('evento_sala', (data: SalaEvento[]) => {
      this.eventosSala.set(data);
    });

    this.socket.on('participantes', (data: Participante[]) => {
      this.participantes.set(data);
    });

    this.socket.on('info_ronda', (data: RondaInfo) => {
      this.infoRonda.set(data);
    });

    this.socket.on('ronda_reiniciada', (data: any) => {
      console.log('[WS:ronda_reiniciada] Evento recibido', data);
      this._cancelPendingVoto();
      this.preguntaActiva.set(null);
      this.ultimoResultado.set(null);
      this.tiempoRestante.set(null);
      this.votosPublico.set(null);
      this.comodinBloqueado.set([]);
      this.rondaReiniciada.set(data);
      if (data?.rondaActiva) {
        this.infoRonda.set({
          ronda: data.rondaActiva.numeroRonda,
          totalRondas: data.rondaActiva.historialPreguntas?.length ?? 0,
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
  cambiarRolParticipante(
    tokenCompartido: string,
    nickname: string,
    nuevoRol: 'estudiante' | 'observador',
  ): void {
    this.socket?.emit('cambiar_rol_participante', { tokenCompartido, nickname, nuevoRol });
  }

  // Notificar uso de comodín para bloquearlo (Broadcast)
  bloquearComodin(tokenCompartido: string, tipoComodin: string): void {
    this.socket?.emit('comodin_bloqueado', { tokenCompartido, tipoComodin });
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
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.conectado.set(false);
    this.rondaReiniciada.set(null);
  }
}
