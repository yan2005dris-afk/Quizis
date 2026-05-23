import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  
  
  private readonly SERVER_URL = 'http://localhost:3000'; 

  constructor() {
    
    this.socket = io(this.SERVER_URL);
  }

  
  unirseASala(pin: string, nombre: string): void {
    this.socket.emit('unirse_sala', { pin, nombre });
  }

  
  emitirEvento(evento: string, payload: any): void {
    this.socket.emit(evento, payload);
  }

  
  escucharEvento<T>(evento: string): Observable<T> {
    return new Observable((subscriber) => {
      this.socket.on(evento, (data: T) => {
        subscriber.next(data);
      });
    });
  }

  
  desconectar(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}