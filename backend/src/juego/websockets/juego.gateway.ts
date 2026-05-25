import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisJuegoService } from './redis-juego.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class JuegoGateway {
  private readonly logger = new Logger(JuegoGateway.name);
  constructor(private readonly redisJuegoService: RedisJuegoService) {}

  @SubscribeMessage('audience:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      salaId: number;
      preguntaId: number;
      participanteId: number;
      opcionId: number;
    },
  ) {
    try {
      const votoPermitido = await this.redisJuegoService.registrarVoto(
        payload.salaId,
        payload.preguntaId,
        payload.participanteId,
      );

      if (!votoPermitido) {
        return {
          success: false,
          message:
            'Acción bloqueada: Ya has enviado una respuesta para esta pregunta.',
        };
      }

      return {
        success: true,
        message: 'Voto registrado correctamente.',
      };
    } catch (error) {
      this.logger.error(`Error en Gateway al procesar voto:`, error);
      return {
        success: false,
        message: 'Error interno del servidor. Intenta nuevamente.',
      };
    }
  }
}
