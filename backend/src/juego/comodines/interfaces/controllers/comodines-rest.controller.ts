import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivateCallJokerUseCase } from '../../application/use-cases/activate-call-joker.use-case';
import { SendHintUseCase } from '../../application/use-cases/send-hint.use-case';
import { BlockComodinUseCase } from '../../application/use-cases/block-comodin.use-case';
import { ParticipantRoleGuard } from '../../../shared/auth/participant-role.guard';
import { ParticipantRoles } from '../../../shared/auth/participant-roles.decorator';
import type { ParticipantRequest } from '../../../../core/common/types/auth-request.types';

/**
 * REST endpoints for comodín mutations.
 *
 * Auth is hybrid (JWT-admin | tokenless-nickname) per `ParticipantRoleGuard`.
 * Open to: estudiante ONLY. The Host- spoof short-circuit (any nickname
 * starting with `Host-` was trusted as admin) has been REMOVED — admin
 * mutations are now routed through this guard, which JWT-verifies admin via
 * sala ownership. Host-anything has no participante row → 404.
 *
 * N2 equivalents of:
 *   - WS `comodin_bloqueado` → POST /:tipo/bloquear
 *   - WS `activar_comodin_llamada` → POST /llamada/activar
 *   - WS `enviar_pista_consultor` → POST /llamada/pista
 *
 * WS broadcasts (`comodin_bloqueado`, `voto_recibido`, `consultor_seleccionado`,
 * `pista_consultor_recibida`) fire identically via the delegated use-cases.
 */
@ApiTags('comodines')
@Controller('salas/:salaId/comodines')
@UseGuards(ParticipantRoleGuard)
export class ComodinesRestController {
  constructor(
    private readonly activateCallJoker: ActivateCallJokerUseCase,
    private readonly sendHint: SendHintUseCase,
    private readonly blockComodinUseCase: BlockComodinUseCase,
  ) {}

  private readonly VALID_TIPOS = ['IA', 'PUBLICO', '50_50', 'LLAMADA'];

  /**
   * Lock a comodín (admin or participant). Equivalent to WS `comodin_bloqueado`.
   */
  @Post(':tipo/bloquear')
  @ParticipantRoles('estudiante')
  @ApiOperation({ summary: 'Lock a comodín for this sala' })
  async bloquear(
    @Param('salaId') tokenCompartido: string,
    @Param('tipo') tipo: string,
    @Body() _body: { nickname?: string; preguntaId?: number },
    @Req() req: ParticipantRequest,
  ) {
    if (!this.VALID_TIPOS.includes(tipo)) {
      throw new BadRequestException(
        `tipo inválido: debe ser uno de ${this.VALID_TIPOS.join(', ')}`,
      );
    }

    // Previously emitted `userId: 0` as a sentinel (audit hole — the WS
    // `comodin_bloqueado` event was broadcast with userId=0). Now pass the
    // resolved participanteId from the guard. `@ParticipantRoles('estudiante')`
    // guarantees the guard set participanteId before this method runs, so
    // the non-null assertion is safe.
    if (req.participante?.participanteId == null) {
      throw new BadRequestException('participante no resuelto por el guard');
    }
    const userId: number = req.participante.participanteId;

    await this.blockComodinUseCase.execute({
      tokenCompartido,
      tipo,
      userId,
    });

    return { ok: true, tipo, tokenCompartido };
  }

  /**
   * Student activates the "Llamada" comodín. Picks a random observer as
   * consultant. Equivalent to WS `activar_comodin_llamada`.
   */
  @Post('llamada/activar')
  @ParticipantRoles('estudiante')
  @ApiOperation({ summary: 'Student activates "Llamada" comodín' })
  async activarLlamada(
    @Param('salaId') tokenCompartido: string,
    @Body() _body: { nickname?: string },
  ) {
    return this.activateCallJoker.execute(tokenCompartido);
  }

  /**
   * Consultant sends a hint back to the student. Equivalent to WS
   * `enviar_pista_consultor`.
   */
  @Post('llamada/pista')
  @ParticipantRoles('estudiante')
  @ApiOperation({ summary: 'Consultant sends hint' })
  async enviarPista(
    @Param('salaId') tokenCompartido: string,
    @Body()
    body: {
      nickname?: string;
      preguntaId: number;
      pista: string;
    },
  ) {
    return this.sendHint.execute({
      tokenCompartido,
      preguntaId: body.preguntaId,
      pista: body.pista,
    });
  }
}
