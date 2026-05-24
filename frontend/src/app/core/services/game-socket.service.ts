import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

// Representa una opción de respuesta individual dentro de una pregunta
export interface Opcion {
  opcionId: number;
  texto: string;
  letra: string;
}

// Representa la estructura completa de una pregunta tal como llega del servidor
export interface Pregunta {
  preguntaId: number;
  texto: string;
  opciones: Opcion[];
  nivel: number;
}

// Representa la distribución de votos del público por opción en una ronda activa
export interface VotosPublico {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

// Servicio singleton: Angular crea una sola instancia compartida por toda la app
@Injectable({ providedIn: 'root' })
export class GameSocketService {
  // Instancia de la conexión WebSocket; null hasta que se llame a conectar()
  private socket: Socket | null = null;

  // Estado reactivo del juego — cualquier componente que los lea se actualiza automáticamente al cambiar
  readonly preguntaActiva = signal<Pregunta | null>(null);
  readonly tiempoRestante = signal<number | null>(null);
  readonly votosPublico = signal<VotosPublico | null>(null);
  readonly comodinBloqueado = signal<string | null>(null);
  readonly conectado = signal<boolean>(false);

  // Abre la conexión al servidor WebSocket y registra los listeners de cada evento del juego
  conectar(url: string, token: string): void {
    this.desconectar();
    this.socket = io(url, { auth: { token } });

    // Actualiza el estado de conexión según el ciclo de vida del socket
    this.socket.on('connect', () => this.conectado.set(true));
    this.socket.on('disconnect', () => this.conectado.set(false));

    // Al llegar una nueva pregunta, la almacena y limpia los votos de la ronda anterior
    this.socket.on('pregunta_liberada', (data: Pregunta) => {
      this.preguntaActiva.set(data);
      this.votosPublico.set(null);
    });

    // Recibe el tiempo restante de la pregunta activa (el servidor lo emite cada segundo)
    this.socket.on('temporizador_actualizado', (data: number) => {
      this.tiempoRestante.set(data);
    });

    // Actualiza los votos del público en tiempo real para que las barras se redibujen
    this.socket.on('voto_recibido', (data: VotosPublico) => {
      this.votosPublico.set(data);
    });

    // Registra qué comodín fue bloqueado para que la pantalla lo marque como no disponible
    this.socket.on('comodin_bloqueado', (data: { tipoComodin: string }) => {
      this.comodinBloqueado.set(data.tipoComodin);
    });
  }

  // Cierra la conexión limpiamente y resetea el estado de conexión
  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.conectado.set(false);
  }
}
