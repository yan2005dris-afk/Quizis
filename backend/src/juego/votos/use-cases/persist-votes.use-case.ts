import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class PersistVotesUseCase {
  private readonly logger = new Logger(PersistVotesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    rondaId: number,
    preguntaId: number,
  ): Promise<{ count: number }> {
    const { processingKey, votes } =
      await this.cacheService.prepareVotesForPersist(rondaId, preguntaId);

    if (votes.length === 0) {
      this.logger.log(
        `[BULK_INSERT] Sin votos para persistir en ronda ${rondaId}, pregunta ${preguntaId}.`,
      );
      return { count: 0 };
    }

    this.logger.log(
      `[BULK_INSERT] Intentando persistir ${votes.length} votos en PostgreSQL...`,
    );

    try {
      const res = await this.prisma.votosPublico.createMany({
        data: votes.map((v) => ({
          rondaId,
          preguntaId,
          participanteId: v.participanteId,
          opcionId: v.opcionId,
        })),
        skipDuplicates: true,
      });

      await this.cacheService.commitVotes(processingKey);
      this.logger.log(
        `[BULK_INSERT] Persistencia exitosa de ${res.count} votos. Caché de procesamiento liberado.`,
      );
      return { count: res.count };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[BULK_INSERT:ERROR] Falló la inserción en PostgreSQL: ${errorMsg}. Reventiendo votos al caché original (Rollback)...`,
      );

      await this.cacheService.rollbackVotes(processingKey, rondaId, preguntaId);
      throw error;
    }
  }
}
