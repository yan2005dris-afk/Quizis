import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ProcessAudienceVoteWebsocket } from '../../infrastructure/websockets/process-audience-vote.websocket';
import type { VotePayload } from '../../infrastructure/websockets/process-audience-vote.websocket';

/**
 * REST endpoint for the audience vote mutation (comodín "Pregunta al público").
 *
 * Auth is per-sala (no JWT): caller identified by `nickname` in body, validated
 * against the participant record (token+nickname+rol=observador). Same pattern
 * as `respuestas.controller.ts` — only observers vote in "Pregunta al público".
 *
 * Equivalent to the WS `audience:vote` handler. Delegates to
 * `ProcessAudienceVoteWebsocket.execute()` — same NX-guards, same
 * WS broadcasts (`voto_recibido`).
 */
@ApiTags('votos')
@Controller('salas/:salaId/votos')
export class VotosRestController {
  constructor(
    private readonly processAudienceVote: ProcessAudienceVoteWebsocket,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Audience vote (comodín "Pregunta al público")',
  })
  async vote(
    @Param('salaId') tokenCompartido: string,
    @Body()
    body: {
      nickname: string;
      rondaId: number;
      preguntaId: number;
      opcionId: number;
    },
  ) {
    if (!body.nickname || body.nickname.trim().length === 0) {
      throw new NotFoundException('nickname requerido para votar en esta sala');
    }

    const nickname = body.nickname.trim();

    const participante = await this.prisma.participantes.findFirst({
      where: {
        sala: { tokenCompartido },
        nickname,
        deletedAt: null,
      },
      select: { participanteId: true, rol: true },
    });

    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
      );
    }

    // Audience vote is open to observers only — the student plays, the
    // audience votes. Admin (Host-*) does not vote either.
    if (participante.rol !== 'observador') {
      throw new ForbiddenException(
        `Tu rol actual (${participante.rol}) no permite votar`,
      );
    }

    const payload: VotePayload = {
      salaId: participante.participanteId,
      rondaId: body.rondaId,
      tokenCompartido,
      preguntaId: body.preguntaId,
      participanteId: participante.participanteId,
      opcionId: body.opcionId,
    };

    return this.processAudienceVote.execute(payload);
  }
}
