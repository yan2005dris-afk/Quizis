import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { SubmitAnswerWebsocket } from '../../infrastructure/websockets/submit-answer.websocket';
import type { SubmitAnswerResult } from '../../infrastructure/websockets/submit-answer.websocket';
import { SubmitAnswerDto } from '../../../respuestas/interfaces/dto/submit-answer.dto';

/**
 * REST endpoint for submitting an answer to the active question.
 *
 * Auth is per-sala: the endpoint validates the caller is a participant of
 * that sala with rol=estudiante via the `tokenCompartido + nickname` pair.
 * No JWT required — students join rooms via shareable links, not auth login.
 *
 * Equivalent to the WS `responder_pregunta` handler — both delegate to
 * `SubmitAnswerWebsocket.execute()` for the actual business logic.
 */
@ApiTags('respuestas')
@Controller('salas/:salaId/respuestas')
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
  @ApiResponse({ status: 403, description: 'User is not an estudiante' })
  @ApiResponse({ status: 404, description: 'Sala or question not found' })
  async submit(
    @Param('salaId') salaId: string,
    @Body() dto: SubmitAnswerDto,
  ): Promise<SubmitAnswerResult> {
    // Validate that the requester is a participant of this sala with rol=estudiante.
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
