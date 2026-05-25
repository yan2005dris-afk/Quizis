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
 * - PATCH /salas/:id/configuracion → Actualizar configuración
 * - POST /salas/:id/regenerar-token → Generar nuevo link
 * - POST /salas/:id/finalizar → Cerrar y persistir stats
 *
 * Endpoints públicos (participantes):
 * - GET /salas/join/:token → Validar token JWT de invitación
 * - GET /salas/:idOrToken → Detalle técnico (usado por el cliente)
 */
@ApiTags('rooms')
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  /**
   * Crea una nueva sala de juego asociada a un banco de preguntas.
   * Genera un token JWT de invitación con expiración configurable.
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear una nueva sala de juego con link de invitación JWT',
  })
  @ApiResponse({
    status: 201,
    description: 'Sala creada con token JWT de invitación',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'create')
  @Post()
  create(@Body() createSalaDto: CreateSalaDto, @AuthUserId() adminId: number) {
    return this.salasService.create(createSalaDto, adminId);
  }

  /**
   * Lista todas las salas (visión general).
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las salas disponibles.' })
  @ApiResponse({ status: 200, description: 'Lista de salas retornada.' })
  async listarTodas() {
    return this.salasService.listarTodas();
  }

  /**
   * Obtiene los bancos de preguntas disponibles para los profesores.
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar los bancos de preguntas disponibles para los profesores',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'create')
  @Get('bancos-disponibles')
  listBancosDisponibles() {
    return this.salasService.listBancosDisponibles();
  }

  /**
   * Valida un token JWT de invitación a sala.
   * Endpoint público utilizado por la audiencia (Grupo 7).
   */
  @ApiOperation({
    summary: 'Validar token JWT de invitación a sala (público)',
  })
  @Get('join/:token')
  validateToken(@Param('token') token: string) {
    return this.salasService.validateToken(token);
  }

  /**
   * Obtiene el detalle de una sala por su ID (admin) o Token (juego).
   */
  @Get(':idOrToken')
  @ApiOperation({
    summary: 'Obtener detalle técnico de una sala por ID o Token.',
  })
  @ApiResponse({ status: 200, description: 'Detalle de la sala.' })
  async obtenerPorId(@Param('idOrToken') idOrToken: string) {
    return this.salasService.obtenerPorId(idOrToken);
  }

  /**
   * Obtiene los comodines configurados para una sala.
   */
  @Get(':idOrToken/comodines')
  @ApiOperation({ summary: 'Obtener comodines configurados para una sala.' })
  async obtenerComodines(@Param('idOrToken') idOrToken: string) {
    return this.salasService.obtenerComodines(idOrToken);
  }

  /**
   * Actualiza la configuración de una sala.
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar la configuración de una sala' })
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
   * Actualiza el estado de una sala.
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar el estado de una sala' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'update')
  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoSalaDto: UpdateEstadoSalaDto,
  ) {
    return this.salasService.updateEstado(id, updateEstadoSalaDto);
  }

  /**
   * Regenera el token de invitación.
   */
  @Post(':id/regenerar-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'update')
  @ApiOperation({ summary: 'Regenerar el token compartido de una sala.' })
  async regenerarToken(@Param('id', ParseIntPipe) id: number) {
    return this.salasService.regenerarToken(id);
  }

  /**
   * Cierre definitivo de la sala.
   */
  @Post(':id/finalizar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('salas', 'update')
  @ApiOperation({ summary: 'Finalizar la partida y persistir estadísticas.' })
  async finalizarSala(@Param('id', ParseIntPipe) id: number) {
    return this.salasService.finalizarSala(id);
  }
}
