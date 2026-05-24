import { Injectable } from '@nestjs/common';
import { InitRondaUseCase } from './use-cases/init-ronda.use-case';

@Injectable()
export class RondasService {
  constructor(private readonly initRondaUseCase: InitRondaUseCase) {}

  async initRonda(salaId: number, participanteId: number) {
    return this.initRondaUseCase.execute(salaId, participanteId);
  }
}
