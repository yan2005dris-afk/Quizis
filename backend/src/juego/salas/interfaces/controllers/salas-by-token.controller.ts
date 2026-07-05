import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { SalaAdminGuard } from '../../../../core/common/guards/sala-admin.guard';
import { UpdateEstadoSalaUseCase } from '../../application/use-cases/update-estado-sala.use-case';
import { UpdateEstadoSalaDto } from '../dto/update-estado-sala.dto';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ReleaseQuestionWebsocket } from '../../../rondas/infrastructure/websockets/release-question.websocket';
import { RegenerateRoomTokenUseCase } from '../../application/use-cases/regenerate-room-token.use-case';
import { FinalizeRoomUseCase } from '../../application/use-cases/finalize-room.use-case';
import { RestartRoundUseCase } from '../../application/use-cases/restart-round.use-case';
import { UpdateParticipantRoleUseCase } from '../../application/use-cases/update-participant-role.use-case';

/**
 * REST endpoints keyed by `tokenCompartido` (the public ID clients know).
 *
 * Consolidates N1 + N2 admin/host actions. All endpoints require the caller
 * to be the admin of the targeted sala (enforced by SalaAdminGuard).
 *
 * N1 endpoints (existing):
 * - PATCH /api/v1/salas/by-token/:salaId/estado
 * - POST  /api/v1/salas/by-token/:salaId/preguntas/liberar
 *
 * N2 endpoints (new):
 * - POST  /api/v1/salas/by-token/:salaId/regenerar-token
 * - POST  /api/v1/salas/by-token/:salaId/finalizar
 * - POST  /api/v1/salas/by-token/:salaId/reiniciar-ronda
 * - PATCH /api/v1/salas/by-token/:salaId/participantes/:nickname/rol
 */
@ApiTags('rooms-by-token')
@ApiBearerAuth()
@Controller('salas/by-token')
@UseGuards(JwtAuthGuard, SalaAdminGuard)
export class SalasByTokenController {
  constructor(
    private readonly updateEstadoSalaUseCase: UpdateEstadoSalaUseCase,
    private readonly releaseQuestionWebsocket: ReleaseQuestionWebsocket,
    private readonly regenerateRoomToken: RegenerateRoomTokenUseCase,
    private readonly finalizeRoom: FinalizeRoomUseCase,
    private readonly restartRound: RestartRoundUseCase,
    private readonly updateParticipantRole: UpdateParticipantRoleUseCase,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveSalaId(tokenCompartido: string): Promise<number> {
    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
      select: { salaId: true },
    });
    if (!sala) throw new NotFoundException('Sala no encontrada');
    return sala.salaId;
  }

  /**
   * Transition the room state (BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO).
   *
   * Equivalent to the WS `cambiar_estado_sala` handler. Delegates to the
   * same use-case (which emits `sala.iniciada` etc. via @nestjs/event-emitter).
   */
  @Patch(':salaId/estado')
  @ApiOperation({
    summary:
      'Update room state (BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO)',
  })
  async updateEstado(
    @Param('salaId') tokenCompartido: string,
    @Body() dto: UpdateEstadoSalaDto,
  ) {
    const salaId = await this.resolveSalaId(tokenCompartido);
    return this.updateEstadoSalaUseCase.execute(salaId, dto);
  }

  /**
   * Release a question for the room. The frontend sends the full `Pregunta`
   * (same contract as the WS `pregunta_liberada` handler today).
   *
   * Delegates to `ReleaseQuestionWebsocket.execute()` so the timer start,
   * consensus initialization, and WS broadcasts (`pregunta_liberada`,
   * `temporizador_actualizado`) are identical to the WS path.
   */
  @Post(':salaId/preguntas/liberar')
  @ApiOperation({ summary: 'Release a question for the room' })
  async liberar(
    @Param('salaId') tokenCompartido: string,
    @Body() body: { pregunta: any },
  ) {
    return this.releaseQuestionWebsocket.execute(
      tokenCompartido,
      body.pregunta,
    );
  }

  /**
   * N2: regenerate the shareable invitation link (invalidates the old token).
   * Equivalent to WS `regenerar_token`.
   */
  @Post(':salaId/regenerar-token')
  @ApiOperation({ summary: 'Regenerate the shareable invitation link' })
  async regenerarToken(@Param('salaId') tokenCompartido: string) {
    const salaId = await this.resolveSalaId(tokenCompartido);
    return this.regenerateRoomToken.execute(salaId);
  }

  /**
   * N2: finalize the game. Closes the current state and persists final stats.
   * Equivalent to WS `finalizar_partida`.
   */
  @Post(':salaId/finalizar')
  @ApiOperation({ summary: 'Finalize the game' })
  async finalizarPartida(@Param('salaId') tokenCompartido: string) {
    const salaId = await this.resolveSalaId(tokenCompartido);
    const result = await this.finalizeRoom.execute(salaId);
    // Trigger the same WS broadcast as the WS handler did
    // (the use-case already updates state; broadcasts are emitted via events)
    return result;
  }

  /**
   * N2: restart the current round (closes existing and opens new with same questions).
   * Equivalent to WS `reiniciar_ronda`.
   */
  @Post(':salaId/reiniciar-ronda')
  @ApiOperation({ summary: 'Restart the current round' })
  async reiniciarRonda(@Param('salaId') tokenCompartido: string) {
    const salaId = await this.resolveSalaId(tokenCompartido);
    return this.restartRound.execute(salaId);
  }

  /**
   * N2: change a participant's role within the sala (estudiante ↔ observador).
   * Equivalent to WS `cambiar_rol_participante`.
   */
  @Patch(':salaId/participantes/:nickname/rol')
  @ApiOperation({
    summary: 'Change participant role (estudiante / observador)',
  })
  async cambiarRol(
    @Param('salaId') tokenCompartido: string,
    @Param('nickname') nickname: string,
    @Body() body: { rol: 'estudiante' | 'observador' },
  ) {
    if (body.rol !== 'estudiante' && body.rol !== 'observador') {
      throw new BadRequestException(
        `Rol inválido: "${body.rol}". Debe ser 'estudiante' u 'observador'.`,
      );
    }
    return this.updateParticipantRole.execute(
      tokenCompartido,
      nickname,
      body.rol,
    );
  }
}
