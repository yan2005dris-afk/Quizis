import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { SalaAdminGuard } from '../../../../core/common/guards/sala-admin.guard';
import { UpdateEstadoSalaUseCase } from '../../application/use-cases/update-estado-sala.use-case';
import { UpdateEstadoSalaDto } from '../dto/update-estado-sala.dto';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { ReleaseQuestionWebsocket } from '../../../rondas/infrastructure/websockets/release-question.websocket';

/**
 * REST endpoints keyed by `tokenCompartido` (the public ID clients know).
 *
 * Lives separately from `SalasController` (keyed by numeric `salaId`) to
 * avoid route collisions during the N1 migration window. In N2 we can
 * consolidate once all mutations move to REST.
 *
 * Endpoints:
 * - PATCH /api/v1/salas/by-token/:salaId/estado — update room state
 * - POST  /api/v1/salas/by-token/:salaId/preguntas/liberar — release a question
 *
 * Both delegate to the existing use-cases; zero business logic duplication.
 */
@ApiTags('rooms-by-token')
@ApiBearerAuth()
@Controller('salas/by-token')
@UseGuards(JwtAuthGuard, SalaAdminGuard)
export class SalasByTokenController {
  constructor(
    private readonly updateEstadoSalaUseCase: UpdateEstadoSalaUseCase,
    private readonly releaseQuestionWebsocket: ReleaseQuestionWebsocket,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Transition the room state (BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO).
   *
   * Equivalent to the WS `cambiar_estado_sala` handler. Delegates to the
   * same use-case (which emits `sala.iniciada` etc. via @nestjs/event-emitter).
   */
  @Patch(':salaId/estado')
  @ApiOperation({
    summary:
      'Update room state (BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO)',
  })
  async updateEstado(
    @Param('salaId') tokenCompartido: string,
    @Body() dto: UpdateEstadoSalaDto,
  ) {
    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
      select: { salaId: true },
    });
    if (!sala) {
      throw new Error('Sala no encontrada');
    }
    return this.updateEstadoSalaUseCase.execute(sala.salaId, dto);
  }

  /**
   * Release a question for the room. The frontend sends the full `Pregunta`
   * (same contract as the WS `pregunta_liberada` handler today).
   *
   * Delegates to `ReleaseQuestionWebsocket.execute()` so the timer start,
   * consensus initialization, and WS broadcasts (`pregunta_liberada`,
   * `temporizador_actualizado`) are identical to the WS path.
   */
  @Post(':salaId/preguntas/liberar')
  @ApiOperation({ summary: 'Release a question for the room' })
  async liberar(
    @Param('salaId') tokenCompartido: string,
    @Body() body: { pregunta: any },
  ) {
    return this.releaseQuestionWebsocket.execute(
      tokenCompartido,
      body.pregunta,
    );
  }
}
