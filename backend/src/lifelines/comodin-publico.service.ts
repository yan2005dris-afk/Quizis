import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../infrastructure/cache/cache.service';
import { QuizGateway } from '../websockets/quiz.gateway';
import { SalasService } from '../juego/salas/salas.service';

@Injectable()
export class ComodinPublicoService {

  constructor(
    private readonly cacheService: CacheService,
    private readonly quizGateway: QuizGateway,
    private readonly salasService: SalasService,
  ) {}

  async activarComodinPublico(tokenCompartido: string) {

    // 1. Obtener sala activa
    const sala = await this.salasService.obtenerPorId(tokenCompartido);
    if (!sala.rondaActiva) {
      throw new NotFoundException('No hay ronda activa');
    }

    const { rondaId, preguntaActualId } = sala.rondaActiva;
    if (!preguntaActualId) {
      throw new NotFoundException('No hay pregunta activa');
    }

    // 2. Leer votos de la caché
    const votos = await this.cacheService.getVotes(rondaId, preguntaActualId);

    // 3. Contar votos por opción
    const conteo: Record<number, number> = {};
    for (const voto of votos) {
      conteo[voto.opcionId] = (conteo[voto.opcionId] ?? 0) + 1;
    }

    // 4. Calcular porcentajes
    const total = votos.length;
    const porcentajes: Record<number, number> = {};
    for (const opcionId in conteo) {
      porcentajes[opcionId] = total === 0
        ? 0
        : Math.round((conteo[opcionId] / total) * 100);
    }

    // 5. Emitir resultado a toda la sala
    this.quizGateway.server
      .to(tokenCompartido)
      .emit('comodin_publico_resultado', { porcentajes, totalVotos: total });

    return { porcentajes, totalVotos: total };
  }
}