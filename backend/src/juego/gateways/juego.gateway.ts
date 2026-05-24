import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisJuegoService } from '../services/redis-juego.service';

@WebSocketGateway({ cors: true })
export class JuegoGateway {
  // Inyectamos el Service mediante el constructor
  constructor(private readonly redisJuegoService: RedisJuegoService) {}

  @SubscribeMessage('audience:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { salaId: number; preguntaId: number; opcionId: number },
  ) {
    const socketId = client.id;

    // El Gateway le pasa los datos al Service
    const votoPermitido = await this.redisJuegoService.registrarVoto(
      payload.salaId,
      payload.preguntaId,
      socketId,
    );

    // El Gateway evalúa la respuesta del Service y decide qué enviar por la red
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
  }
}
