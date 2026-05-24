import { Injectable } from '@nestjs/common';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateEstadoSalaDto } from './dto/update-estado-sala.dto';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';

/**
 * Servicio fachada para el módulo de Salas.
 *
 * Actúa como coordinador entre el controlador y los casos de uso.
 * No contiene lógica de negocio propia; delega toda la ejecución
 * a los Use Cases inyectados para mantener el principio de
 * responsabilidad única (SRP).
 */
@Injectable()
export class SalasService {
  constructor(
    private readonly createSalaUseCase: CreateSalaUseCase,
    private readonly updateEstadoSalaUseCase: UpdateEstadoSalaUseCase,
  ) {}

  /**
   * Delega la creación de una sala al caso de uso correspondiente.
   * @param createSalaDto - Datos validados de la nueva sala.
   * @param adminId - ID del administrador autenticado.
   */
  async create(createSalaDto: CreateSalaDto, adminId: number) {
    return this.createSalaUseCase.execute(createSalaDto, adminId);
  }

  /**
   * Delega la actualización de estado al caso de uso correspondiente.
   * @param id - ID de la sala a actualizar.
   * @param updateEstadoSalaDto - DTO con el nuevo estado.
   */
  async updateEstado(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    return this.updateEstadoSalaUseCase.execute(id, updateEstadoSalaDto);
  }
}
