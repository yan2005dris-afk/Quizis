import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class VotosService {
  private readonly logger = new Logger(VotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Registra un voto temporal de forma ultra rápida en caché.
   * OPTIMIZADO: No realiza consultas SELECT a base de datos por cada voto.
   * La integridad y unicidad se delegan a PostgreSQL durante el Bulk Insert.
   */
  async registrarVoto(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    await this.cacheService.setVote(rondaId, preguntaId, participanteId, opcionId);
  }

  /**
   * Devuelve los votos en caché.
   */
  async obtenerVotosCache(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }

  /**
   * Rutina Bulk Insert ATÓMICA: Extrae masivamente usando popVotes y persiste en un solo Query.
   */
  async persistirVotos(rondaId: number, preguntaId: number): Promise<{ count: number }> {
    // popVotes obtiene y elimina los votos de caché atómicamente
    const votos = await this.cacheService.popVotes(rondaId, preguntaId);
    
    if (votos.length === 0) {
      this.logger.log(`[BULK_INSERT] Sin votos para persistir en ronda ${rondaId}, pregunta ${preguntaId}.`);
      return { count: 0 };
    }

    this.logger.log(`[BULK_INSERT] Persistiendo ${votos.length} votos en PostgreSQL para ronda ${rondaId}, pregunta ${preguntaId}...`);

    // Bulk Insert idempotente gracias a @@unique en base de datos y skipDuplicates
    const res = await this.prisma.votosPublico.createMany({
      data: votos.map((v) => ({
        rondaId,
        preguntaId,
        participanteId: v.participanteId,
        opcionId: v.opcionId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`[BULK_INSERT] Persistencia exitosa de ${res.count} votos en PostgreSQL.`);
    return { count: res.count };
  }
}
