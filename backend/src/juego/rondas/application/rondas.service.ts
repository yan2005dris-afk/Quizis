import { Injectable } from '@nestjs/common';
import { CreateRondaDto } from '../interfaces/dto/create-ronda.dto';
import { CreateRondaUseCase } from './use-cases/create-ronda.use-case';

/**
 * Servicio fachada para el módulo de Rondas.
 *
 * Sigue el mismo patrón del servicio de Salas: no contiene lógica
 * de negocio propia y delega toda la ejecución a los Use Cases
 * inyectados, manteniendo el principio de responsabilidad única (SRP).
 */
@Injectable()
export class RondasService {
  constructor(private readonly createRondaUseCase: CreateRondaUseCase) {}

  /**
   * Delega la creación de una ronda al caso de uso correspondiente.
   * @param createRondaDto - Datos validados de la nueva ronda.
   */
  async create(createRondaDto: CreateRondaDto) {
    return this.createRondaUseCase.execute(createRondaDto);
  }
}
