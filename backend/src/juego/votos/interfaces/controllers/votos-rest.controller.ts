import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcessAudienceVoteUseCase } from '../../application/use-cases/process-audience-vote.use-case';
import type { VotePayload } from '../../application/use-cases/process-audience-vote.use-case';
import { ParticipantRoleGuard } from '../../../shared/auth/participant-role.guard';
import { ParticipantRoles } from '../../../shared/auth/participant-roles.decorator';
import type { ParticipantRequest } from '../../../../core/common/types/auth-request.types';

/**
 * REST endpoint for the audience vote mutation (comodín "Pregunta al público").
 *
 * Auth is hybrid (JWT-admin | tokenless-nickname) per `ParticipantRoleGuard`.
 * Open to: observador ONLY. estudiante is denied (403). Admin JWT for own sala
 * would resolve role=admin → role check denies (admin NOT in [observador]).
 *
 * Equivalent to the WS `audience:vote` handler. Delegates to
 * `ProcessAudienceVoteUseCase.execute()` — same NX-guards, same
 * WS broadcasts (`voto_recibido`).
 */
@ApiTags('votos')
@Controller('salas/:salaId/votos')
@UseGuards(ParticipantRoleGuard)
export class VotosRestController {
  constructor(
    private readonly processAudienceVote: ProcessAudienceVoteUseCase,
  ) {}

  @Post()
  @ParticipantRoles('observador')
  @ApiOperation({
    summary: 'Audience vote (comodín "Pregunta al público")',
  })
  async vote(
    @Param('salaId') tokenCompartido: string,
    @Body()
    body: {
      rondaId: number;
      preguntaId: number;
      opcionId: number;
    },
    @Req() req: ParticipantRequest,
  ) {
    const participante = req.participante;
    if (participante?.participanteId == null) {
      throw new NotFoundException('No se pudo identificar al participante');
    }
    // salaId is attached by ParticipantRoleGuard after its sala lookup,
    // so this controller no longer needs PrismaService.
    if (typeof participante.salaId !== 'number') {
      throw new BadRequestException(
        'No se pudo resolver la sala desde la sesión',
      );
    }

    const payload: VotePayload = {
      salaId: participante.salaId,
      rondaId: body.rondaId,
      tokenCompartido,
      preguntaId: body.preguntaId,
      participanteId: participante.participanteId,
      opcionId: body.opcionId,
    };

    return this.processAudienceVote.execute(payload);
  }
}
