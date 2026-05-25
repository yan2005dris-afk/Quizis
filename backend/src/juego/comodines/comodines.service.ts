import { Injectable } from '@nestjs/common';
import { GetIaSuggestionUseCase } from './use-cases/get-ia-suggestion.use-case';
import { SelectRandomConsultantUseCase } from './use-cases/select-random-consultant.use-case';
import { GetPublicVoteResultsUseCase } from './use-cases/get-public-vote-results.use-case';

@Injectable()
export class ComodinesService {
  constructor(
    private readonly getIaSuggestionUseCase: GetIaSuggestionUseCase,
    private readonly selectRandomConsultantUseCase: SelectRandomConsultantUseCase,
    private readonly getPublicVoteResultsUseCase: GetPublicVoteResultsUseCase,
  ) {}

  async obtenerSugerenciaIa(pregunta: string) {
    return this.getIaSuggestionUseCase.execute(pregunta);
  }

  async seleccionarConsultorAleatorio(tokenCompartido: string) {
    return this.selectRandomConsultantUseCase.execute(tokenCompartido);
  }

  async obtenerResultadosPublico(rondaId: number, preguntaId: number) {
    return this.getPublicVoteResultsUseCase.execute(rondaId, preguntaId);
  }
}
