import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RondasService } from './rondas.service';
import { InitRondaDto } from './dto/init-ronda.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/common/guards/roles.guard';
import { RequireRole } from '../../infrastructure/common/decorators/require-role.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('rondas')
@ApiBearerAuth()
@Controller('rondas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RondasController {
  constructor(private readonly rondasService: RondasService) {}

  @ApiOperation({
    summary: 'Inicializar una nueva ronda para una sala',
    description:
      'Selecciona aleatoriamente las preguntas del banco y crea la ronda en estado pendiente.',
  })
  @ApiResponse({ status: 201, description: 'Ronda inicializada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validación o sin preguntas' })
  @RequireRole('ADMIN')
  @Post('init')
  async initRonda(@Body() dto: InitRondaDto) {
    return this.rondasService.initRonda(dto.salaId, dto.participanteId);
  }
}
