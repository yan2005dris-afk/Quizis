import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from '../../application/chat.service';
import { ParticipantRoleGuard } from '../../../shared/auth/participant-role.guard';
import { ParticipantRoles } from '../../../shared/auth/participant-roles.decorator';

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
  ) {
    if (!body.texto || body.texto.trim().length === 0) {
      throw new BadRequestException('texto no puede estar vacío');
    }
    if (body.tipo !== 'mensaje' && body.tipo !== 'sugerencia') {
      throw new BadRequestException(
        `tipo inválido: debe ser 'mensaje' o 'sugerencia'`,
      );
    }

    // Guard validates nickname presence + sala membership; for the admin
    // branch (JWT) nickname is not required in body. Provide a placeholder
    // for the admin path so ChatService receives the expected shape.
    const nickname = (body.nickname ?? '').trim();

    return this.chatService.sendMessage({
      tokenCompartido,
      nickname,
      texto: body.texto.trim(),
      tipo: body.tipo,
    });
  }
}
