import { Injectable } from '@nestjs/common';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateEstadoSalaDto } from './dto/update-estado-sala.dto';
import { UpdateConfiguracionSalaDto } from './dto/update-configuracion-sala.dto';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './use-cases/get-sala-details.use-case';
import { GetSalaDetailUseCase } from './use-cases/get-sala-detail.use-case';
import { UpdateConfiguracionSalaUseCase } from './use-cases/update-configuracion-sala.use-case';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';
import { RegenerateRoomTokenUseCase } from './use-cases/regenerate-room-token.use-case';
import { FinalizeRoomUseCase } from './use-cases/finalize-room.use-case';

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
    private readonly validateTokenSalaUseCase: ValidateTokenSalaUseCase,
    private readonly listBancosDisponiblesUseCase: ListBancosDisponiblesUseCase,
    private readonly getSalaDetailsUseCase: GetSalaDetailsUseCase, // Para admin/detalles
    private readonly getSalaDetailUseCase: GetSalaDetailUseCase,   // Para gameplay/historial
    private readonly updateConfiguracionSalaUseCase: UpdateConfiguracionSalaUseCase,
    private readonly listAllSalasUseCase: ListAllSalasUseCase,
    private readonly getSalaLifelinesUseCase: GetSalaLifelinesUseCase,
    private readonly regenerateRoomTokenUseCase: RegenerateRoomTokenUseCase,
    private readonly finalizeRoomUseCase: FinalizeRoomUseCase,
  ) {}

  /**
   * Delega la creación de una sala al caso de uso correspondiente.
   * Genera un token JWT de invitación y selecciona preguntas al azar.
   * @param createSalaDto - Datos validados de la nueva sala.
   * @param adminId - ID del administrador autenticado.
   */
  async create(createSalaDto: CreateSalaDto, adminId: number) {
    return this.createSalaUseCase.execute(createSalaDto, adminId);
  }

  /**
   * Delega la obtención de los detalles de una sala al caso de uso correspondiente.
   * @param idOrToken - ID o Token de la sala a consultar.
   */
  async obtenerPorId(idOrToken: number | string) {
    // Si es un número, usamos GetSalaDetails (admin)
    // Si es un string (token), usamos GetSalaDetail (gameplay)
    if (typeof idOrToken === 'number' || !isNaN(Number(idOrToken))) {
        return this.getSalaDetailsUseCase.execute(Number(idOrToken));
    }
    return this.getSalaDetailUseCase.execute(idOrToken);
  }

  /**
   * Listado simplificado para admin
   */
  async findOne(id: number) {
    return this.getSalaDetailsUseCase.execute(id);
  }

  /**
   * Delega la actualización de configuración al caso de uso correspondiente.
   * @param id - ID de la sala a configurar.
   * @param updateConfigDto - Datos de configuración a guardar.
   */
  async updateConfiguracion(
    id: number,
    updateConfigDto: UpdateConfiguracionSalaDto,
  ) {
    return this.updateConfiguracionSalaUseCase.execute(id, updateConfigDto);
  }

  /**
   * Delega la actualización de estado al caso de uso correspondiente.
   * @param id - ID de la sala a actualizar.
   * @param updateEstadoSalaDto - DTO con el nuevo estado.
   */
  async updateEstado(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    return this.updateEstadoSalaUseCase.execute(id, updateEstadoSalaDto);
  }

  /**
   * Valida un token JWT de invitación a sala.
   * Verifica la firma, expiración y estado de la sala.
   * @param token - JWT de invitación extraído de la URL.
   */
  async validateToken(token: string) {
    return this.validateTokenSalaUseCase.execute(token);
  }

  /**
   * Obtiene los bancos de preguntas disponibles para los profesores.
   */
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
