import { Injectable } from '@nestjs/common';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaDetailUseCase } from './use-cases/get-sala-detail.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';

@Injectable()
export class SalasService {
  constructor(
    private readonly listAllSalasUseCase: ListAllSalasUseCase,
    private readonly getSalaDetailUseCase: GetSalaDetailUseCase,
    private readonly getSalaLifelinesUseCase: GetSalaLifelinesUseCase,
  ) {}

  async listarTodas() {
    return this.listAllSalasUseCase.execute();
  }

  async obtenerPorId(idOrToken: number | string) {
    return this.getSalaDetailUseCase.execute(idOrToken);
  }

  async obtenerComodines(idOrToken: number | string) {
    return this.getSalaLifelinesUseCase.execute(idOrToken);
  }
}
