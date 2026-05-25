import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class RedisJuegoService {
  private readonly logger = new Logger(RedisJuegoService.name);
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async registrarVoto(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
  ): Promise<boolean> {
    try {
      //crea llave unica para usuario en esa pregunta especifica
      const cacheKey = `sala:${rondaId}:pregunta:${preguntaId}:voto:${participanteId}`;

      const yaVoto = await this.cacheService.get(cacheKey);
      if (yaVoto) {
        return false; // Retorna false bloqueando el doble voto
      }
      const expireTime = this.configService.get<number>(
        'REDIS_VOTE_EXPIRE_TIME',
        3600,
      );
      await this.cacheService.set(cacheKey, 'true', expireTime);

      return true;
    } catch (error) {
      this.logger.error(
        `Falla de conexión con Redis al procesar voto del participante ${participanteId}`,
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}
