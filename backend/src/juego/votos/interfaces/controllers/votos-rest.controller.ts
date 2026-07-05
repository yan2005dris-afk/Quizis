import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ProcessAudienceVoteWebsocket } from '../../infrastructure/websockets/process-audience-vote.websocket';
import type { VotePayload } from '../../infrastructure/websockets/process-audience-vote.websocket';

/**
 * REST endpoint for the audience vote mutation (comodín "Pregunta al público").
 *
 * Equivalent to the WS `audience:vote` handler. Delegates to
 * `ProcessAudienceVoteWebsocket.execute()` — same NX-guards, same
 * WS broadcasts (`voto_recibido`).
 */
@ApiTags('votos')
@ApiBearerAuth()
@Controller('api/v1/salas/:salaId/votos')
@UseGuards(JwtAuthGuard)
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
    @Body() body: { rondaId: number; preguntaId: number; opcionId: number },
    @Req() req: Request,
  ) {
    // Auth comes from JwtAuthGuard; the user's nickname is in their participant
    // record (same as the WS path).
    const user = (req as any).user;
    const nickname = user?.nombre ?? user?.email ?? 'unknown';

    const participante = await this.prisma.participantes.findFirst({
      where: {
        sala: { tokenCompartido },
        nickname,
        deletedAt: null,
      },
      select: { participanteId: true },
    });

    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
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

    void nickname; // already in payload via participanteId lookup
    return this.processAudienceVote.execute(payload);
  }
}
