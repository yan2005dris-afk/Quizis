import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VotesCacheService } from '../juego/votos/cache/votes-cache.service';
import { SalasService } from '../juego/salas/salas.service';

@Injectable()
export class ComodinPublicoService {
  constructor(
    private readonly votesCacheUseCase: VotesCacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly salasService: SalasService,
  ) {}

  async activarComodinPublico(tokenCompartido: string) {
    // 1. Obtener sala activa
    const sala = await this.salasService.obtenerPorId(tokenCompartido);
    if (!sala.rondaActiva) {
      throw new NotFoundException('No hay ronda activa');
    }

    const { rondaId, preguntaActualId, preguntaActual } = sala.rondaActiva;
    if (!preguntaActualId || !preguntaActual) {
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

    // 4. Mapear por posición real de las opciones (A, B, C, D)
    const letras = ['A', 'B', 'C', 'D'];
    const total = votos.length;
    const resultado: Record<string, number> & { total: number } = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      total,
    };

    for (const opcion of preguntaActual.opciones) {
      const letra = opcion.letra as 'A' | 'B' | 'C' | 'D';
      if (letras.includes(letra)) {
        const votos = conteo[opcion.opcionId] ?? 0;
        resultado[letra] = total === 0 ? 0 : Math.round((votos / total) * 100);
      }
    }

    // 5. Emitir resultado a toda la sala via EventEmitter (Bug 3 fix)
    this.eventEmitter.emit('publico.voto.recibido', {
      tokenCompartido,
      resultado,
    });
    return resultado;
  }
}
