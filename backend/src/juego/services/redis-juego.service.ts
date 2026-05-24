import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisJuegoService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async registrarVoto(
    salaId: number,
    preguntaId: number,
    socketId: string,
  ): Promise<boolean> {
    const redisKey = `sala:${salaId}:pregunta:${preguntaId}:votos`;

    // SADD es una operación atómica en Redis.
    // Retorna 1 si inserta un nuevo valor. Retorna 0 si el socketId ya estaba registrado.
    const fueAgregado = await this.redis.sadd(redisKey, socketId);

    if (fueAgregado === 1) {
      // Configuramos la expiración de la llave a 7200 segundos (2 horas) para liberar RAM
      await this.redis.expire(redisKey, 7200);
      return true;
    }

    return false; // Retorna false bloqueando el doble voto
  }
}
