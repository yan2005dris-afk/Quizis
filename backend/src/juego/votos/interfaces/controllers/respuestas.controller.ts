import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { SubmitAnswerWebsocket } from '../../infrastructure/websockets/submit-answer.websocket';
import type { SubmitAnswerResult } from '../../infrastructure/websockets/submit-answer.websocket';
import { SubmitAnswerDto } from '../../../respuestas/interfaces/dto/submit-answer.dto';

/**
 * REST endpoint for submitting an answer to the active question.
 *
 * Equivalent to the WS `responder_pregunta` handler — both delegate to
 * `SubmitAnswerWebsocket.execute()` for the actual business logic.
 *
 * Why REST (not just WS): commands belong in REST so they're idempotent,
 * cacheable, debuggable via curl/Postman, and protected by standard JWT
 * middleware. WS stays for realtime notifications only.
 *
 * Auth: JWT standard header (Authorization: Bearer ...). Per-sala role
 * validation is performed inside this controller because the role is
 * stored on `participantes.rol` (not in the JWT payload).
 */
@ApiTags('respuestas')
@ApiBearerAuth()
@Controller('api/v1/salas/:salaId/respuestas')
@UseGuards(JwtAuthGuard)
export class RespuestasController {
  constructor(
    private readonly submitAnswerWebsocket: SubmitAnswerWebsocket,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit an answer for the active question' })
  @ApiResponse({
    status: 200,
    description: 'Answer recorded (consensus may be pending or resolved)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid DTO or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'User is not an estudiante of this sala',
  })
  @ApiResponse({ status: 404, description: 'Sala or question not found' })
  async submit(
    @Param('salaId') salaId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req: Request,
  ): Promise<SubmitAnswerResult> {
    void req; // authenticated via JwtAuthGuard (request.user populated)
    // Validate that the requester is a participant of this sala with rol=estudiante.
    // participantes.nickname is the per-sala identity (no FK to Usuarios).
    const participante = await this.prisma.participantes.findFirst({
      where: {
        sala: { tokenCompartido: salaId },
        nickname: dto.nickname,
        deletedAt: null,
      },
      select: { rol: true },
    });

    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
      );
    }
    if (participante.rol !== 'estudiante') {
      throw new ForbiddenException(
        `Tu rol actual (${participante.rol}) no permite responder preguntas`,
      );
    }

    // Delegate to the existing business logic (used by WS handler too).
    // The same NX-guards, race-condition protection, and broadcast events apply.
    return this.submitAnswerWebsocket.execute({
      tokenCompartido: salaId,
      rondaId: dto.rondaId,
      preguntaId: dto.preguntaId,
      opcionId: dto.opcionId,
      nickname: dto.nickname,
      comodinUsado: dto.comodinUsado,
    });
  }
}
