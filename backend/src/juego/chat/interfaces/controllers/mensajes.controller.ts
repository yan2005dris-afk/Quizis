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
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ChatService } from '../../application/chat.service';

/**
 * REST endpoint for chat messages.
 *
 * Equivalent to the WS `enviar_mensaje` handler. Delegates to
 * `ChatService.sendMessage()` — WS broadcast `mensaje_chat` fires
 * identically to the old WS path.
 *
 * Rate limited to 1 msg/sec per user via @Throttle override (N2: AC-N2-10).
 */
@ApiTags('chat')
@ApiBearerAuth()
@Controller('api/v1/salas/:salaId/mensajes')
@UseGuards(JwtAuthGuard)
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
    @Body() body: { texto: string; tipo: 'mensaje' | 'sugerencia' },
    @Req() req: Request,
  ) {
    if (!body.texto || body.texto.trim().length === 0) {
      throw new BadRequestException('texto no puede estar vacío');
    }
    if (body.tipo !== 'mensaje' && body.tipo !== 'sugerencia') {
      throw new BadRequestException(
        `tipo inválido: debe ser 'mensaje' o 'sugerencia'`,
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
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
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
