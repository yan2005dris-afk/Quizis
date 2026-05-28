import { Injectable } from '@nestjs/common';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';
import { EliminateOptions5050UseCase } from './use-cases/eliminate-options-5050.use-case';

@Injectable()
export class ComodinesService {
  constructor(
    private readonly getIaSuggestionUseCase: GetIaSuggestionUseCase,
    private readonly selectRandomConsultantUseCase: SelectRandomConsultantUseCase,
    private readonly getPublicVoteResultsUseCase: GetPublicVoteResultsUseCase,
    private readonly eliminateOptions5050UseCase: EliminateOptions5050UseCase,
  ) {}

  async obtenerSugerenciaIa(preguntaId: number) {
    return this.getIaSuggestionUseCase.execute(preguntaId);
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
}
