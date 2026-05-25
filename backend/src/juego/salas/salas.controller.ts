import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateEstadoSalaDto } from './dto/update-estado-sala.dto';
import { UpdateConfiguracionSalaDto } from './dto/update-configuracion-sala.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from '../../infrastructure/common/decorators/require-permission.decorator';
import { AuthUserId } from '../../infrastructure/common/decorators/auth-user-id.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

/**
 * Controlador REST para la gestión de salas de juego.
 *
 * Endpoints protegidos (admin):
 * - POST /salas → Crear sala con token JWT de invitación
 * - PATCH /salas/:id/estado → Actualizar estado de la sala
 *
 * Endpoints públicos (participantes):
 * - GET /salas/join/:token → Validar token JWT de invitación
 */
@ApiTags('salas')
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  /**
   * Crea una nueva sala de juego asociada a un banco de preguntas.
   * Genera un token JWT de invitación con expiración configurable
   * y selecciona al azar las preguntas del banco.
   * @param createSalaDto - Datos de la sala (bancoId, nombre, limitePreguntas, duracionTokenHoras).
   * @param adminId - ID del administrador extraído del token JWT.
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear una nueva sala de juego con link de invitación JWT',
  })
  @ApiResponse({
    status: 201,
    description:
      'Sala creada con token JWT de invitación, link y preguntas seleccionadas al azar',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'create')
  @Post()
  create(@Body() createSalaDto: CreateSalaDto, @AuthUserId() adminId: number) {
    return this.salasService.create(createSalaDto, adminId);
  }

  /**
   * Obtiene la lista de bancos de preguntas disponibles para los profesores.
   * Requiere autenticación de administrador y permisos de creación de salas.
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar los bancos de preguntas disponibles para los profesores',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de bancos con sus conteos de preguntas',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'create')
  @Get('bancos-disponibles')
  listBancosDisponibles() {
    return this.salasService.listBancosDisponibles();
  }

  /**
   * Valida un token JWT de invitación a sala.
   * Endpoint público — no requiere autenticación.
   * Lo utilizan los participantes (Grupo 7) para verificar que el link
   * de invitación sea válido antes de unirse por WebSocket.
   * @param token - Token JWT extraído de la URL del link de invitación.
   */
  @ApiOperation({
    summary:
      'Validar token JWT de invitación a sala (público, sin autenticación)',
  })
  @ApiParam({
    name: 'token',
    description: 'Token JWT de invitación generado al crear la sala',
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido — retorna datos públicos de la sala',
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @Get('join/:token')
  validateToken(@Param('token') token: string) {
    return this.salasService.validateToken(token);
  }

  /**
   * Obtiene los detalles de una sala de juego por su ID.
   * Requiere autenticación de administrador y permisos de lectura de salas.
   * @param id - ID de la sala (validado por ParseIntPipe).
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener los detalles de una sala' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la sala devueltos con éxito',
  })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salasService.findOne(id);
  }

  /**
   * Actualiza la configuración de una sala de juego por su ID.
   * Requiere autenticación de administrador y permisos de actualización de salas.
   * @param id - ID de la sala.
   * @param updateConfigDto - DTO con los nuevos datos de configuración.
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar la configuración de una sala' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada con éxito',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud incorrecta o límite de preguntas excede el banco',
  })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'update')
  @Patch(':id/configuracion')
  updateConfiguracion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConfigDto: UpdateConfiguracionSalaDto,
  ) {
    return this.salasService.updateConfiguracion(id, updateConfigDto);
  }

  /**
   * Actualiza el estado de una sala siguiendo la máquina de estados:
   * BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO.
   * @param id - ID de la sala (validado como entero por ParseIntPipe).
   * @param updateEstadoSalaDto - DTO con el nuevo estado solicitado.
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar el estado de una sala' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'update')
  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoSalaDto: UpdateEstadoSalaDto,
  ) {
    return this.salasService.updateEstado(id, updateEstadoSalaDto);
  }
}
