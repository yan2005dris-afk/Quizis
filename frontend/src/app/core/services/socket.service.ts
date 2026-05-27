import { inject, Injectable, InjectionToken } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export const SOCKET_SERVER_URL = new InjectionToken<string | undefined>('SOCKET_SERVER_URL');
export const SOCKET_IO_CLIENT = new InjectionToken<Socket>('SOCKET_IO_CLIENT');

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private readonly serverUrl = inject(SOCKET_SERVER_URL, { optional: true });
  private socket = inject(SOCKET_IO_CLIENT, { optional: true });

  connect(): Socket {
    if (!this.socket) {
      console.log('[SocketService] Inicializando nueva conexión a', this.serverUrl || 'default');
      this.socket = this.serverUrl ? io(this.serverUrl) : io();
      
      this.socket.on('connect', () => {
        console.log('[SocketService] Conectado exitosamente con ID:', this.socket?.id);
      });
      
      this.socket.on('disconnect', () => {
        console.log('[SocketService] Desconectado');
      });
    }

    return this.socket;
  }

  private getSocket(): Socket {
    return this.socket ?? this.connect();
  }

  unirseASala(tokenCompartido: string, nombre: string): void {
    const socket = this.getSocket();
    const payload = { tokenCompartido, nombre };
    console.log('[SocketService] Intentando unirse a sala con payload:', payload);
    
    if (socket.connected) {
      socket.emit('unirse_sala', payload);
    } else {
      socket.once('connect', () => {
        console.log('[SocketService] Socket conectado, emitiendo unirse_sala');
        socket.emit('unirse_sala', payload);
      });
    }
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
