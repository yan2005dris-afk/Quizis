import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export const SOCKET_SERVER_URL = new InjectionToken<string | undefined>('SOCKET_SERVER_URL');
export const SOCKET_IO_CLIENT = new InjectionToken<Socket>('SOCKET_IO_CLIENT');

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket?: Socket;

  constructor(
    @Optional() @Inject(SOCKET_SERVER_URL) private readonly serverUrl?: string,
    @Optional() @Inject(SOCKET_IO_CLIENT) socket?: Socket
  ) {
    this.socket = socket;
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = this.serverUrl ? io(this.serverUrl) : io();
    }

    return this.socket;
  }

  private getSocket(): Socket {
    return this.socket ?? this.connect();
  }


  unirseASala(tokenCompartido: string, nombre: string): void {
    this.getSocket().emit('unirse_sala', { tokenCompartido, nombre });
  }

  emitirEvento(evento: string, payload: any): void {
    this.getSocket().emit(evento, payload);
  }

  escucharEvento<T>(evento: string): Observable<T> {
    return new Observable((subscriber) => {
      const socket = this.getSocket();
      const listener = (data: T) => {
        subscriber.next(data);
      };

      socket.on(evento, listener);

      return () => {
        socket.off(evento, listener);
      };
    });
  }

  desconectar(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}