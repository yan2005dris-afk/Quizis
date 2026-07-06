import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from '../../application/chat.service';
import { ParticipantRoleGuard } from '../../../shared/auth/participant-role.guard';
import { ParticipantRoles } from '../../../shared/auth/participant-roles.decorator';
import type { ParticipantRequest } from '../../../../core/common/types/auth-request.types';

/**
 * REST endpoint for chat messages.
 *
 * Auth is hybrid (JWT-admin | tokenless-nickname) per `ParticipantRoleGuard`.
 * Open to: admin (own sala via JWT), estudiante, observador.
 *
 * Equivalent to the WS `enviar_mensaje` handler. Delegates to
 * `ChatService.sendMessage()` — WS broadcast `mensaje_chat` fires
 * identically to the old WS path (fixed in the N2 chat-broadcast bug).
 *
 * Rate limited to 1 msg/sec per user via @Throttle override (N2: AC-N2-10).
 */
@ApiTags('chat')
@Controller('salas/:salaId/mensajes')
@UseGuards(ParticipantRoleGuard)
export class MensajesController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 1, ttl: 1000 } })
  @ParticipantRoles('admin', 'estudiante', 'observador')
  @ApiOperation({ summary: 'Send a chat message in the sala' })
  async send(
    @Param('salaId') tokenCompartido: string,
    @Body()
    body: {
      nickname?: string;
      texto: string;
      tipo: 'mensaje' | 'sugerencia';
    },
    @Req() req: ParticipantRequest,
  ) {
    if (!body.texto || body.texto.trim().length === 0) {
      throw new BadRequestException('texto no puede estar vacío');
    }
    if (body.tipo !== 'mensaje' && body.tipo !== 'sugerencia') {
      throw new BadRequestException(
        `tipo inválido: debe ser 'mensaje' o 'sugerencia'`,
      );
    }

    // Admin role is force-labeled: the auth guard's admin branch resolves
    // role='admin' (non-spoofable JWT-sala-owner check). For admins we
    // IGNORE body.nickname entirely — otherwise a participant could spoof the
    // admin identity by sending an arbitrary `nickname` string. Participants
    // (tokenless branch) take their identity from body.nickname.
    let nickname: string;
    if (req.participante?.role === 'admin') {
      nickname = `Admin #${req.participante.userId}`;
    } else {
      nickname = (body.nickname ?? '').trim();
      if (nickname.length === 0) {
        throw new BadRequestException('nickname requerido');
      }
    }

    return this.chatService.sendMessage({
      tokenCompartido,
      nickname,
      texto: body.texto.trim(),
      tipo: body.tipo,
    });
  }
}
