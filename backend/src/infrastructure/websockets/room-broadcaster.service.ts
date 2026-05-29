import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * Thin wrapper around Socket.IO server.to() for broadcasting room events.
 * Server reference is set by JuegoGateway afterInit to avoid circular DI.
 */
@Injectable()
export class RoomBroadcasterService {
  private readonly logger = new Logger(RoomBroadcasterService.name);
  private server!: Server;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('RoomBroadcasterService initialized with server reference');
  }

  /**
   * Broadcast an event to all clients in a room.
   */
  broadcastToRoom(tokenCompartido: string, event: string, data: any): void {
    if (!this.server) {
      this.logger.warn('Server not initialized yet, skipping broadcast');
      return;
    }
    this.server.to(tokenCompartido).emit(event, data);
  }
}