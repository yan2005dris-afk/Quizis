import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ChatService } from '../../application/chat.service';

/**
 * REST endpoint for chat messages.
 *
 * Auth is per-sala (no JWT): the caller is identified by the
 * `nickname` in the body, and the controller validates that a participant
 * with that nickname exists in the targeted sala (deletedAt=null). This
 * matches the pattern used by `respuestas.controller.ts` — students and
 * observers join rooms via shareable links, not via login.
 *
 * Equivalent to the WS `enviar_mensaje` handler. Delegates to
 * `ChatService.sendMessage()` — WS broadcast `mensaje_chat` fires
 * identically to the old WS path (fixed in the N2 chat-broadcast bug).
 *
 * Rate limited to 1 msg/sec per user via @Throttle override (N2: AC-N2-10).
 */
@ApiTags('chat')
@Controller('salas/:salaId/mensajes')
export class MensajesController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 1, ttl: 1000 } })
  @ApiOperation({ summary: 'Send a chat message in the sala' })
  async send(
    @Param('salaId') tokenCompartido: string,
    @Body()
    body: {
      nickname: string;
      texto: string;
      tipo: 'mensaje' | 'sugerencia';
    },
  ) {
    if (!body.nickname || body.nickname.trim().length === 0) {
      throw new BadRequestException('nickname no puede estar vacío');
    }
    if (!body.texto || body.texto.trim().length === 0) {
      throw new BadRequestException('texto no puede estar vacío');
    }
    if (body.tipo !== 'mensaje' && body.tipo !== 'sugerencia') {
      throw new BadRequestException(
        `tipo inválido: debe ser 'mensaje' o 'sugerencia'`,
      );
    }

    const nickname = body.nickname.trim();

    const participante = await this.prisma.participantes.findFirst({
      where: {
        sala: { tokenCompartido },
        nickname,
        deletedAt: null,
      },
      select: { rol: true },
    });

    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
      );
    }

    // Chat is open to any active participant (estudiante or observador).
    // The historical "user" from req was the JWT-authenticated admin — that
    // never applied to participants joining via shareable links.
    if (
      participante.rol !== 'estudiante' &&
      participante.rol !== 'observador'
    ) {
      throw new ForbiddenException(
        `Tu rol actual (${participante.rol}) no permite enviar mensajes`,
      );
    }

    return this.chatService.sendMessage({
      tokenCompartido,
      nickname,
      texto: body.texto.trim(),
      tipo: body.tipo,
    });
  }
}
