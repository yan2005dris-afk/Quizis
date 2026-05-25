import { Injectable } from '@nestjs/common';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateEstadoSalaDto } from './dto/update-estado-sala.dto';
import { UpdateConfiguracionSalaDto } from './dto/update-configuracion-sala.dto';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './use-cases/get-sala-details.use-case';
import { UpdateConfiguracionSalaUseCase } from './use-cases/update-configuracion-sala.use-case';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';
import { RegenerateRoomTokenUseCase } from './use-cases/regenerate-room-token.use-case';
import { FinalizeRoomUseCase } from './use-cases/finalize-room.use-case';

/**
 * Servicio fachada para el módulo de Salas.
 */
@Injectable()
export class SalasService {
  constructor(
    private readonly createSalaUseCase: CreateSalaUseCase,
    private readonly updateEstadoSalaUseCase: UpdateEstadoSalaUseCase,
    private readonly validateTokenSalaUseCase: ValidateTokenSalaUseCase,
    private readonly listBancosDisponiblesUseCase: ListBancosDisponiblesUseCase,
    private readonly getSalaDetailsUseCase: GetSalaDetailsUseCase,
    private readonly updateConfiguracionSalaUseCase: UpdateConfiguracionSalaUseCase,
    private readonly listAllSalasUseCase: ListAllSalasUseCase,
    private readonly getSalaLifelinesUseCase: GetSalaLifelinesUseCase,
    private readonly regenerateRoomTokenUseCase: RegenerateRoomTokenUseCase,
    private readonly finalizeRoomUseCase: FinalizeRoomUseCase,
  ) {}

  async create(createSalaDto: CreateSalaDto, adminId: number) {
    return this.createSalaUseCase.execute(createSalaDto, adminId);
  }

  async obtenerPorId(idOrToken: number | string) {
    return this.getSalaDetailsUseCase.execute(idOrToken);
  }

  async findOne(id: number) {
    return this.getSalaDetailsUseCase.execute(id);
  }

  async updateConfiguracion(
    id: number,
    updateConfigDto: UpdateConfiguracionSalaDto,
  ) {
    return this.updateConfiguracionSalaUseCase.execute(id, updateConfigDto);
  }

  async updateEstado(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    return this.updateEstadoSalaUseCase.execute(id, updateEstadoSalaDto);
  }

  async validateToken(token: string) {
    return this.validateTokenSalaUseCase.execute(token);
  }

  async listBancosDisponibles() {
    return this.listBancosDisponiblesUseCase.execute();
  }

  async listarTodas() {
    return this.listAllSalasUseCase.execute();
  }

  async obtenerComodines(idOrToken: number | string) {
    return this.getSalaLifelinesUseCase.execute(idOrToken);
  }

  async regenerarToken(salaId: number) {
    return this.regenerateRoomTokenUseCase.execute(salaId);
  }

  async finalizarSala(salaId: number) {
    return this.finalizeRoomUseCase.execute(salaId);
  }
}
