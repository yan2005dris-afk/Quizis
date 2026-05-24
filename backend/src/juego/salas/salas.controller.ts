import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateEstadoSalaDto } from './dto/update-estado-sala.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from '../../infrastructure/common/decorators/require-permission.decorator';
import { AuthUserId } from '../../infrastructure/common/decorators/auth-user-id.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controlador REST para la gestión de salas de juego.
 *
 * Todos los endpoints están protegidos por:
 * - JwtAuthGuard: Verifica que el usuario esté autenticado con un token JWT válido.
 * - PermissionsGuard: Verifica que el usuario tenga los permisos necesarios
 *   (recurso:acción) asignados a su rol.
 */
@ApiTags('salas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  /**
   * Crea una nueva sala de juego asociada a un banco de preguntas.
   * Genera automáticamente un código PIN único (ej. UPSE-742).
   * @param createSalaDto - Datos de la sala (bancoId, nombre, limitePreguntas).
   * @param adminId - ID del administrador extraído del token JWT.
   */
  @ApiOperation({ summary: 'Crear una nueva sala de juego' })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  @RequiredPermission('salas', 'create')
  @Post()
  create(@Body() createSalaDto: CreateSalaDto, @AuthUserId() adminId: number) {
    return this.salasService.create(createSalaDto, adminId);
  }

  /**
   * Actualiza el estado de una sala siguiendo la máquina de estados:
   * BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO.
   * @param id - ID de la sala (validado como entero por ParseIntPipe).
   * @param updateEstadoSalaDto - DTO con el nuevo estado solicitado.
   */
  @ApiOperation({ summary: 'Actualizar el estado de una sala' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @RequiredPermission('salas', 'update')
  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoSalaDto: UpdateEstadoSalaDto,
  ) {
    return this.salasService.updateEstado(id, updateEstadoSalaDto);
  }
}
