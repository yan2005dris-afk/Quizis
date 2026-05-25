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
    await this.cacheService.setVote(
      rondaId,
      preguntaId,
      participanteId,
      opcionId,
    );
  }

  /**
   * Devuelve los votos en caché.
   */
  async obtenerVotosCache(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }

  /**
   * Rutina Bulk Insert con Transacción en 2 Fases y Autorecuperación (Self-Healing).
   *
   * GARANTÍA DE CERO PÉRDIDA DE DATOS:
   * 1. Aislamiento Atómico: En la Fase 1, los votos se mueven de forma atómica a una clave única
   *    con marca de tiempo `:processing:${timestamp}_${random}`. Esto aísla los votos a persistir
   *    y permite que nuevos votos sigan ingresando libremente en la clave original.
   * 2. Recuperación Automática (Self-Healing): Si el servidor sufre un crash después de aislar la clave
   *    pero antes de confirmar (dejar votos "atascados"), en la siguiente ejecución se escanea cualquier
   *    clave `:processing:*` huérfana de esa pregunta, recuperando y fusionando sus votos de forma proactiva.
   * 3. Rollback de Transacción: Si PostgreSQL falla o está caído durante la inserción en la Fase 2,
   *    se atrapa la excepción y se ejecuta un rollback inmediato que devuelve y fusiona los votos
   *    en procesamiento de vuelta a la cola original en caché (Redis/Memoria), impidiendo pérdidas.
   */
  async persistirVotos(
    rondaId: number,
    preguntaId: number,
  ): Promise<{ count: number }> {
    // Fase 1: Aislar atómicamente los votos actuales y recuperar fallidos anteriores
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
      // Fase 2: Insert masivo idempotente en PostgreSQL
      const res = await this.prisma.votosPublico.createMany({
        data: votes.map((v) => ({
          rondaId,
          preguntaId,
          participanteId: v.participanteId,
          opcionId: v.opcionId,
        })),
        skipDuplicates: true,
      });

      // Confirmación: Éxito en DB, eliminamos clave temporal de caché
      await this.cacheService.commitVotes(processingKey);
      this.logger.log(
        `[BULK_INSERT] Persistencia exitosa de ${res.count} votos. Caché de procesamiento liberado.`,
      );
      return { count: res.count };
    } catch (error) {
      // Rollback: Fallo en DB, revertimos y fusionamos los votos al caché original
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[BULK_INSERT:ERROR] Falló la inserción en PostgreSQL: ${errorMsg}. Reventiendo votos al caché original (Rollback)...`,
      );

      await this.cacheService.rollbackVotes(processingKey, rondaId, preguntaId);
      throw error; // Re-lanzar error para que la API retorne 500
    }
  }
}
