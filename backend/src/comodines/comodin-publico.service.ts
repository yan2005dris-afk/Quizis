import { Injectable, NotFoundException } from '@nestjs/common';
import { VotesCacheUseCase } from '../infrastructure/cache/use-cases/votes-cache.use-case';
import { JuegoGateway } from '../infrastructure/websockets/juego.gateway';
import { SalasService } from '../juego/salas/salas.service';

@Injectable()
export class ComodinPublicoService {
  constructor(
    private readonly votesCacheUseCase: VotesCacheUseCase,
    private readonly juegoGateway: JuegoGateway,
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
    const votos = await this.votesCacheUseCase.getVotes(
      rondaId,
      preguntaActualId,
    );

    // 3. Contar votos por opción
    const conteo: Record<number, number> = {};
    for (const voto of votos) {
      conteo[voto.opcionId] = (conteo[voto.opcionId] ?? 0) + 1;
    }

    // 4. Calcular porcentajes con tipado fuerte
    const total = votos.length;
    const porcentajes: Record<number, number> = {};
    for (const [opcionIdStr, count] of Object.entries(conteo)) {
      const opcionId = Number(opcionIdStr);
      porcentajes[opcionId] =
        total === 0 ? 0 : Math.round((count / total) * 100);
    }

    // 5. Emitir resultado a toda la sala con estructura A/B/C/D
    const resultado = {
      A: porcentajes[1] ?? 0,
      B: porcentajes[2] ?? 0,
      C: porcentajes[3] ?? 0,
      D: porcentajes[4] ?? 0,
      total,
    };

    this.juegoGateway.server
      .to(tokenCompartido)
      .emit('comodin_publico_resultado', resultado);

    return resultado;
  }
}
