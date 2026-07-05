import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { SalasService } from '../../../salas/application/salas.service';
import { ActivateCallJokerWebsocket } from '../../infrastructure/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../infrastructure/websockets/send-hint.websocket';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

/**
 * REST endpoints for comodín mutations.
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
@ApiBearerAuth()
@Controller('api/v1/salas/:salaId/comodines')
@UseGuards(JwtAuthGuard)
export class ComodinesRestController {
  constructor(
    private readonly salasService: SalasService,
    private readonly activateCallJoker: ActivateCallJokerWebsocket,
    private readonly sendHint: SendHintWebsocket,
    private readonly prisma: PrismaService,
  ) {}

  private readonly VALID_TIPOS = ['IA', 'PUBLICO', '50_50', 'LLAMADA'];

  /**
   * Lock a comodín (admin or participant). Equivalent to WS `comodin_bloqueado`.
   */
  @Post(':tipo/bloquear')
  @ApiOperation({ summary: 'Lock a comodín for this sala' })
  async bloquear(
    @Param('salaId') tokenCompartido: string,
    @Param('tipo') tipo: string,
    @Body() _body: { preguntaId?: number },
    @Req() req: Request,
  ) {
    if (!this.VALID_TIPOS.includes(tipo)) {
      throw new BadRequestException(
        `tipo inválido: debe ser uno de ${this.VALID_TIPOS.join(', ')}`,
      );
    }

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
      throw new BadRequestException('No eres participante de esta sala');
    }

    await this.salasService.addBlockedComodin(tokenCompartido, tipo);

    return { ok: true, tipo, tokenCompartido };
  }

  /**
   * Student activates the "Llamada" comodín. Picks a random observer as
   * consultant. Equivalent to WS `activar_comodin_llamada`.
   */
  @Post('llamada/activar')
  @ApiOperation({ summary: 'Student activates "Llamada" comodín' })
  async activarLlamada(
    @Param('salaId') tokenCompartido: string,
    @Body() _body: { pregunta: any },
  ) {
    return this.activateCallJoker.execute(tokenCompartido);
  }

  /**
   * Consultant sends a hint back to the student. Equivalent to WS
   * `enviar_pista_consultor`.
   */
  @Post('llamada/pista')
  @ApiOperation({ summary: 'Consultant sends hint' })
  async enviarPista(
    @Param('salaId') tokenCompartido: string,
    @Body() body: { preguntaId: number; pista: string },
  ) {
    return this.sendHint.execute({
      tokenCompartido,
      preguntaId: body.preguntaId,
      pista: body.pista,
    });
  }
}
