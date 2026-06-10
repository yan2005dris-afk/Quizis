import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PermissionsService } from '../application/permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from 'src/identity/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from 'src/infrastructure/common/decorators/require-permission.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Crea un nuevo permiso en el sistema.
   * Requiere permiso: permissions:create
   */
  @ApiOperation({
    summary: 'Crear permiso',
    description:
      'Crea un nuevo permiso en el sistema (ej: users:read, users:create).',
  })
  @ApiBody({
    type: CreatePermissionDto,
    description: 'Datos del permiso a crear (resource y action)',
  })
  @ApiResponse({
    status: 201,
    description: 'Permiso creado exitosamente',
    schema: {
      example: {
        permissionsId: 1,
        resource: 'users',
        action: 'read',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso permissions:create',
  })
  @ApiResponse({ status: 409, description: 'Conflicto - El permiso ya existe' })
  @RequiredPermission('permissions', 'create')
  @Post()
  createPermissions(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  /**
   * Obtiene todos los permisos del sistema.
   * Requiere permiso: permissions:read
   */
  @ApiOperation({
    summary: 'Listar permisos',
    description: 'Retorna todos los permisos registrados en el sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso permissions:read',
  })
  @RequiredPermission('permissions', 'read')
  @Get()
  findAllPermissions() {
    return this.permissionsService.findAll();
  }

  /**
   * Obtiene un permiso específico por su ID.
   * Requiere permiso: permissions:read
   */
  @ApiOperation({
    summary: 'Obtener permiso por ID',
    description: 'Retorna los datos de un permiso específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del permiso',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Permiso encontrado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso permissions:read',
  })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  @RequiredPermission('permissions', 'read')
  @Get(':id')
  findOnePermissions(@Param('id', ParseIntPipe) id: string) {
    return this.permissionsService.findOne(+id);
  }

  /**
   * Actualiza los datos de un permiso.
   * Requiere permiso: permissions:update
   */
  @ApiOperation({
    summary: 'Actualizar permiso',
    description: 'Actualiza el resource o action de un permiso existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del permiso a actualizar',
    type: Number,
    example: 1,
  })
  @ApiBody({
    type: UpdatePermissionDto,
    description: 'Datos a actualizar (resource y/o action)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permiso actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso permissions:update',
  })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  @RequiredPermission('permissions', 'update')
  @Patch(':id')
  updatePermissions(
    @Param('id', ParseIntPipe) id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(+id, updatePermissionDto);
  }

  /**
   * Elimina un permiso (Soft Delete).
   * Requiere permiso: permissions:delete
   */
  @ApiOperation({
    summary: 'Eliminar permiso',
    description: 'Marca un permiso como eliminado (soft delete).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del permiso a eliminar',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Permiso eliminado exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso permissions:delete',
  })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  @RequiredPermission('permissions', 'delete')
  @Delete(':id')
  SoftDeletePermissions(@Param('id', ParseIntPipe) id: string) {
    return this.permissionsService.remove(+id);
  }
}
