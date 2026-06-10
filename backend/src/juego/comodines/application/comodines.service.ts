import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './use-cases/eliminate-options-5050.use-case';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { HelperCacheService } from '../infrastructure/cache/helper-cache.service';

@Injectable()
export class ComodinesService {
  constructor(
    private readonly getIaSuggestionUseCase: GetIaSuggestionUseCase,
    private readonly selectRandomConsultantUseCase: SelectRandomConsultantUseCase,
    private readonly getPublicVoteResultsUseCase: GetPublicVoteResultsUseCase,
    private readonly eliminateOptions5050UseCase: EliminateOptions5050UseCase,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly helperCache: HelperCacheService,
  ) {}

  async obtenerSugerenciaIa(preguntaId: number) {
    const result = await this.getIaSuggestionUseCase.execute(preguntaId);

    // Broadcast IA suggestion to ALL participants via event
    const pregunta = await this.prisma.preguntas.findUnique({
      where: { preguntaId },
      include: {
        respuestasRonda: {
          include: {
            ronda: {
              include: {
                sala: { select: { tokenCompartido: true } },
              },
            },
          },
        },
      },
    });

    const respuesta = pregunta?.respuestasRonda?.[0];
    const tokenCompartido = respuesta?.ronda?.sala?.tokenCompartido;

    if (tokenCompartido) {
      this.eventEmitter.emit('comodin.ia.suggestion', {
        preguntaId,
        literal: result.literal,
        explicacion: result.explicacion,
        tokenCompartido,
      });
    }

    return result;
  }

  async seleccionarConsultorAleatorio(tokenCompartido: string) {
    return this.selectRandomConsultantUseCase.execute(tokenCompartido);
  }

  async obtenerResultadosPublico(rondaId: number, preguntaId: number) {
    return this.getPublicVoteResultsUseCase.execute(rondaId, preguntaId);
  }

  async eliminateOptions5050(preguntaId: number) {
    return this.eliminateOptions5050UseCase.execute(preguntaId);
  }

  async getActiveHelper(tokenCompartido: string) {
    return this.helperCache.getActiveHelper(tokenCompartido);
  }
}
