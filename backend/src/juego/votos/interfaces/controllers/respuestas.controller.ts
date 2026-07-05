import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitAnswerUseCase } from '../../application/use-cases/submit-answer.use-case';
import type { SubmitAnswerResult } from '../../application/use-cases/submit-answer.use-case';
import { SubmitAnswerDto } from '../../../respuestas/interfaces/dto/submit-answer.dto';
import { ParticipantRoleGuard } from '../../../shared/auth/participant-role.guard';
import { ParticipantRoles } from '../../../shared/auth/participant-roles.decorator';

/**
 * REST endpoint for submitting an answer to the active question.
 *
 * Auth is hybrid (JWT-admin | tokenless-nickname) per `ParticipantRoleGuard`.
 * Open to: estudiante ONLY. observador is denied (403). Admin JWT resolves
 * role=admin → role check denies (admin NOT in [estudiante]).
 *
 * Equivalent to the WS `responder_pregunta` handler — both delegate to
 * `SubmitAnswerUseCase.execute()` for the actual business logic.
 */
@ApiTags('respuestas')
@Controller('salas/:salaId/respuestas')
@UseGuards(ParticipantRoleGuard)
export class RespuestasController {
  constructor(private readonly submitAnswerUseCase: SubmitAnswerUseCase) {}

  @Post()
  @HttpCode(200)
  @ParticipantRoles('estudiante')
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
    return this.submitAnswerUseCase.execute({
      tokenCompartido: salaId,
      rondaId: dto.rondaId,
      preguntaId: dto.preguntaId,
      opcionId: dto.opcionId,
      nickname: dto.nickname,
      comodinUsado: dto.comodinUsado,
    });
  }
}
