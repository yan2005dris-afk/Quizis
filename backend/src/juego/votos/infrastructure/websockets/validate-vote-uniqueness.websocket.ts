import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParticipantsCacheService } from '../../../salas/infrastructure/cache/participants-cache.service';

@Injectable()
export class ValidateVoteUniquenessWebsocket {
  private readonly logger = new Logger(ValidateVoteUniquenessWebsocket.name);

  constructor(
    private readonly cacheService: ParticipantsCacheService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    salaId: number,
    preguntaId: number,
    participanteId: number,
  ): Promise<boolean> {
    try {
      const cacheKey = `votes:check:${salaId}:${preguntaId}`;

      const expireTime = this.configService.get<number>(
        'REDIS_VOTE_EXPIRE_TIME',
        3600,
      );

      const votoPermitido = await this.cacheService.checkAndSetDuplicate(
        cacheKey,
        participanteId.toString(),
        expireTime,
      );

      return votoPermitido;
    } catch (error) {
      this.logger.error(
        `Falla crítica al validar duplicidad de voto para participante ${participanteId}`,
        error instanceof Error ? error.stack : error,
      );
      return true;
    }
  }
}
