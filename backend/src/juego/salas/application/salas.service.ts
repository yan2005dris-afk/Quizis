import { Injectable } from '@nestjs/common';
import { CreateSalaDto } from '../interfaces/dto/create-sala.dto';
import { UpdateEstadoSalaDto } from '../interfaces/dto/update-estado-sala.dto';
import { UpdateConfiguracionSalaDto } from '../interfaces/dto/update-configuracion-sala.dto';
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
import { JoinSalaUseCase } from './use-cases/join-sala.use-case';
import { GetInvitacionTokenUseCase } from './use-cases/get-invitacion-token.use-case';
import { UpdateParticipantRoleUseCase } from './use-cases/update-participant-role.use-case';
import { GetParticipantsWithRolesUseCase } from './use-cases/get-participants-with-roles.use-case';
import { RestartRoundUseCase } from './use-cases/restart-round.use-case';
import { ReactivateRoomUseCase } from './use-cases/reactivate-room.use-case';
import { ParticipantsCacheService } from '../../shared/room-state/participants-cache.service';
import { RoomStateCacheService } from '../../shared/room-state/room-state-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameEvents } from '../../../core/common/events/game-events.types';

/**
 * Servicio fachada para el módulo de Salas.
 *
 * Actúa como coordinador entre el controlador y los casos de uso.
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
    private readonly joinSalaUseCase: JoinSalaUseCase,
    private readonly getInvitacionTokenUseCase: GetInvitacionTokenUseCase,
    private readonly updateParticipantRoleUseCase: UpdateParticipantRoleUseCase,
    private readonly getParticipantsWithRolesUseCase: GetParticipantsWithRolesUseCase,
    private readonly restartRoundUseCase: RestartRoundUseCase,
    private readonly reactivateRoomUseCase: ReactivateRoomUseCase,
    private readonly participantsCache: ParticipantsCacheService,
    private readonly roomStateCache: RoomStateCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crea una nueva sala de juego.
   */
  async create(createSalaDto: CreateSalaDto, adminId: number) {
    return this.createSalaUseCase.execute(createSalaDto, adminId);
  }

  /**
   * Obtiene detalles de una sala por ID o Token.
   */
  async obtenerPorId(idOrToken: number | string) {
    return this.getSalaDetailsUseCase.execute(idOrToken);
  }

  /**
   * Alias para obtenerPorId usado por algunos controladores.
   */
  async findOne(id: number) {
    return this.getSalaDetailsUseCase.execute(id);
  }

  /**
   * Actualiza la configuración de la sala.
   */
  async updateConfiguracion(
    id: number,
    updateConfigDto: UpdateConfiguracionSalaDto,
  ) {
    return this.updateConfiguracionSalaUseCase.execute(id, updateConfigDto);
  }

  /**
   * Actualiza el estado (waiting, playing, finished).
   */
  async updateEstado(id: number, updateEstadoSalaDto: UpdateEstadoSalaDto) {
    return this.updateEstadoSalaUseCase.execute(id, updateEstadoSalaDto);
  }

  /**
   * Valida un token JWT de invitación.
   */
  async validateToken(token: string) {
    return this.validateTokenSalaUseCase.execute(token);
  }

  /**
   * Registra a un nuevo participante en la sala.
   */
  async join(token: string, nickname: string) {
    return this.joinSalaUseCase.execute(token, nickname);
  }

  /**
   * Lista bancos de preguntas para el admin.
   */
  async listBancosDisponibles(usuarioId: number) {
    return this.listBancosDisponiblesUseCase.execute(usuarioId);
  }

  /**
   * Lista todas las salas filtradas por admin.
   */
  async listarTodas(adminId: number) {
    return this.listAllSalasUseCase.execute(adminId);
  }

  /**
   * Obtiene los comodines de la sala.
   */
  async obtenerComodines(idOrToken: number | string) {
    return this.getSalaLifelinesUseCase.execute(idOrToken);
  }

  /**
   * Genera un nuevo token compartido.
   */
  async regenerarToken(salaId: number) {
    return this.regenerateRoomTokenUseCase.execute(salaId);
  }

  /**
   * Finaliza la sala y persiste estadísticas.
   */
  async finalizarSala(salaId: number) {
    return this.finalizeRoomUseCase.execute(salaId);
  }

  async getInvitacionToken(salaId: number) {
    return this.getInvitacionTokenUseCase.execute(salaId);
  }

  async updateParticipantRole(
    tokenCompartido: string,
    nickname: string,
    nuevoRol: string,
    onlineNicknames?: string[],
  ) {
    return this.updateParticipantRoleUseCase.execute(
      tokenCompartido,
      nickname,
      nuevoRol,
      onlineNicknames,
    );
  }

  async getParticipantsWithRoles(tokenCompartido: string, nicknames: string[]) {
    return this.getParticipantsWithRolesUseCase.execute(
      tokenCompartido,
      nicknames,
    );
  }

  async reiniciarRonda(salaId: number) {
    return this.restartRoundUseCase.execute(salaId);
  }

  async reactivarSala(salaId: number) {
    return this.reactivateRoomUseCase.execute(salaId);
  }

  async changeParticipantRole(
    token: string,
    nickname: string,
    nuevoRol: string,
  ) {
    const nicknames = await this.participantsCache.getOnlineParticipants(token);
    await this.updateParticipantRole(token, nickname, nuevoRol, nicknames);
    const list = await this.getParticipantsWithRoles(token, nicknames);
    this.eventEmitter.emit(GameEvents.SALA.PARTICIPANTES_ACTUALIZADOS, {
      tokenCompartido: token,
      list,
    });
    return list;
  }

  async addBlockedComodin(tokenCompartido: string, tipoComodin: string) {
    return this.roomStateCache.addBlockedComodin(tokenCompartido, tipoComodin);
  }

  async getBlockedComodines(tokenCompartido: string) {
    return this.roomStateCache.getBlockedComodines(tokenCompartido);
  }

  async getTiempoLimite(
    tokenCompartido: string,
  ): Promise<{ segundos: number; rondaId: number }> {
    const sala = await this.getSalaDetailsUseCase.execute(tokenCompartido);
    return {
      segundos: (sala as any).tiempoLimitePregunta ?? 30,
      rondaId: (sala as any).rondaActiva?.rondaId,
    };
  }
}
