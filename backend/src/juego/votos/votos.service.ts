import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
   * Registra un voto temporal en el caché de alta velocidad (Redis/Memoria).
   */
  async registrarVoto(
    rondaId: number,
    preguntaId: number,
    participanteId: number,
    opcionId: number,
  ): Promise<void> {
    // Validamos que los recursos existan antes de guardar el voto efímero
    const [ronda, pregunta, participante, opcion] = await Promise.all([
      this.prisma.rondas.findUnique({ where: { rondaId } }),
      this.prisma.preguntas.findUnique({ where: { preguntaId } }),
      this.prisma.participantes.findUnique({ where: { participanteId } }),
      this.prisma.opcionesPregunta.findUnique({ where: { opcionId } }),
    ]);

    if (!ronda) throw new NotFoundException(`Ronda con ID ${rondaId} no encontrada.`);
    if (!pregunta) throw new NotFoundException(`Pregunta con ID ${preguntaId} no encontrada.`);
    if (!participante) throw new NotFoundException(`Participante con ID ${participanteId} no encontrado.`);
    if (!opcion) throw new NotFoundException(`Opción con ID ${opcionId} no encontrada.`);

    await this.cacheService.setVote(rondaId, preguntaId, participanteId, opcionId);
  }

  /**
   * Devuelve los votos acumulados en caché para la pregunta de la ronda actual.
   */
  async obtenerVotosCache(rondaId: number, preguntaId: number) {
    return this.cacheService.getVotes(rondaId, preguntaId);
  }

  /**
   * Rutina de Bulk Insert: Extrae los votos capturados en caché, los guarda masivamente
   * en PostgreSQL con un solo insert, y libera la memoria/Redis.
   */
  async persistirVotos(rondaId: number, preguntaId: number): Promise<{ count: number }> {
    const votos = await this.cacheService.getVotes(rondaId, preguntaId);
    
    if (votos.length === 0) {
      this.logger.log(`[BULK_INSERT] Sin votos para persistir en ronda ${rondaId}, pregunta ${preguntaId}.`);
      return { count: 0 };
    }

    this.logger.log(`[BULK_INSERT] Persistiendo ${votos.length} votos en PostgreSQL para ronda ${rondaId}, pregunta ${preguntaId}...`);

    // Bulk Insert usando createMany de Prisma
    const res = await this.prisma.votosPublico.createMany({
      data: votos.map((v) => ({
        rondaId,
        preguntaId,
        participanteId: v.participanteId,
        opcionId: v.opcionId,
      })),
      skipDuplicates: true, // Evita colisiones si la transacción se reintenta
    });

    // Limpiamos los votos del caché
    await this.cacheService.clearVotes(rondaId, preguntaId);
    this.logger.log(`[BULK_INSERT] Persistencia exitosa de ${res.count} votos. Caché limpiado.`);

    return { count: res.count };
  }
}
