import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RondasService } from './rondas.service';
import { CreateRondaDto } from './dto/create-ronda.dto';
import { JwtAuthGuard } from '../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from '../../infrastructure/common/decorators/require-permission.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controlador REST para la gestión de rondas de juego.
 *
 * Protegido por JwtAuthGuard (autenticación) y PermissionsGuard (autorización).
 * La creación de rondas asigna preguntas aleatorias al participante
 * usando el algoritmo ORDER BY RANDOM() de PostgreSQL.
 */
@ApiTags('rondas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rondas')
export class RondasController {
  constructor(private readonly rondasService: RondasService) {}

  /**
   * Crea una nueva ronda para un participante dentro de una sala.
   * Selecciona aleatoriamente las preguntas del banco asociado a la sala
   * y las almacena en el campo `preguntasAsignadas` de la ronda.
   * @param createRondaDto - Datos de la ronda (salaId, participanteId, numeroRonda).
   */
  @ApiOperation({
    summary: 'Crear una nueva ronda (asigna preguntas aleatorias)',
  })
  @ApiResponse({
    status: 201,
    description: 'Ronda creada y preguntas asignadas',
  })
  @RequiredPermission('rondas', 'create')
  @Post()
  create(@Body() createRondaDto: CreateRondaDto) {
    return this.rondasService.create(createRondaDto);
  }
}
