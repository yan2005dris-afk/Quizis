import { Injectable } from '@nestjs/common';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { CreateSalaDto } from './dto/create-sala.dto';
import { EstadoSala } from './dto/update-sala-estado.dto';

@Injectable()
export class SalasService {
  constructor(
    private readonly createSalaUseCase: CreateSalaUseCase,
    private readonly updateEstadoSalaUseCase: UpdateEstadoSalaUseCase,
  ) {}

  async createSala(adminId: number, dto: CreateSalaDto) {
    return this.createSalaUseCase.execute(adminId, dto);
  }

  async updateEstado(salaId: number, nuevoEstado: EstadoSala) {
    return this.updateEstadoSalaUseCase.execute(salaId, nuevoEstado);
  }
}
