import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalasService } from '../../../salas/application/salas.service';
import { ActivateCallJokerWebsocket } from '../../infrastructure/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../infrastructure/websockets/send-hint.websocket';
import { RoomBroadcasterService } from '../../../infrastructure/websockets/room-broadcaster.service';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

/**
 * REST endpoints for comodín mutations.
 *
 * Auth is per-sala (no JWT): caller identified by `nickname` in body, validated
 * against the participant record (token+nickname). Same pattern as
 * `respuestas.controller.ts`. Role-specific rules (e.g. only estudiante activates
 * "Llamada") are enforced inside the use-cases, not here — this controller
 * only guards that the caller is an active participant of the sala.
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
export class ComodinesRestController {
  constructor(
    private readonly salasService: SalasService,
    private readonly activateCallJoker: ActivateCallJokerWebsocket,
    private readonly sendHint: SendHintWebsocket,
    private readonly roomBroadcaster: RoomBroadcasterService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly VALID_TIPOS = ['IA', 'PUBLICO', '50_50', 'LLAMADA'];

  /**
   * Resolves a nickname (provided in the body) against the participant record
   * of the targeted sala. Throws NotFoundException if no active participant
   * matches. Returns the participant row for the caller to use.
   */
  private async resolveParticipante(
    tokenCompartido: string,
    nickname: string,
  ): Promise<{ participanteId: number; rol: string }> {
    if (!nickname || nickname.trim().length === 0) {
      throw new NotFoundException(
        'nickname requerido para operar en esta sala',
      );
    }
    const participante = await this.prisma.participantes.findFirst({
      where: {
        sala: { tokenCompartido },
        nickname: nickname.trim(),
        deletedAt: null,
      },
      select: { participanteId: true, rol: true },
    });
    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
      );
    }
    return participante;
  }

  /**
   * Lock a comodín (admin or participant). Equivalent to WS `comodin_bloqueado`.
   */
  @Post(':tipo/bloquear')
  @ApiOperation({ summary: 'Lock a comodín for this sala' })
  async bloquear(
    @Param('salaId') tokenCompartido: string,
    @Param('tipo') tipo: string,
    @Body() body: { nickname: string; preguntaId?: number },
  ) {
    if (!this.VALID_TIPOS.includes(tipo)) {
      throw new BadRequestException(
        `tipo inválido: debe ser uno de ${this.VALID_TIPOS.join(', ')}`,
      );
    }

    const participante = await this.resolveParticipante(
      tokenCompartido,
      body.nickname,
    );

    await this.salasService.addBlockedComodin(tokenCompartido, tipo);

    // Mirror the WS handler's broadcast behavior (AC-N2-12)
    this.roomBroadcaster.broadcastToRoom(tokenCompartido, 'comodin_bloqueado', {
      tokenCompartido,
      userId: participante.participanteId,
      tipoComodin: tipo,
    });

    if (tipo === 'PUBLICO') {
      this.roomBroadcaster.broadcastToRoom(tokenCompartido, 'voto_recibido', {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        total: 0,
      });
    }

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
    @Body() body: { nickname: string },
  ) {
    await this.resolveParticipante(tokenCompartido, body.nickname);
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
    @Body()
    body: {
      nickname: string;
      preguntaId: number;
      pista: string;
    },
  ) {
    await this.resolveParticipante(tokenCompartido, body.nickname);
    return this.sendHint.execute({
      tokenCompartido,
      preguntaId: body.preguntaId,
      pista: body.pista,
    });
  }
}
