import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
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

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Crea un nuevo rol en el sistema.
   * Requiere permiso: roles:create
   */
  @ApiOperation({
    summary: 'Crear rol',
    description: 'Crea un nuevo rol en el sistema.',
  })
  @ApiBody({
    type: CreateRoleDto,
    description: 'Datos del rol a crear',
  })
  @ApiResponse({
    status: 201,
    description: 'Rol creado exitosamente',
    schema: {
      example: {
        rolId: 1,
        nombre: 'Administrador',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso roles:create',
  })
  @ApiResponse({ status: 409, description: 'Conflicto - El rol ya existe' })
  @RequiredPermission('roles', 'create')
  @Post()
  createRol(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  /**
   * Obtiene todos los roles del sistema.
   * Requiere permiso: roles:read
   */
  @ApiOperation({
    summary: 'Listar roles',
    description:
      'Retorna todos los roles registrados en el sistema. Sin paginación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso roles:read',
  })
  @RequiredPermission('roles', 'read')
  @Get()
  findAllRoles() {
    return this.rolesService.findAll();
  }

  /**
   * Obtiene un rol específico por su ID, incluyendo sus permisos asociados.
   * Requiere permiso: roles:read
   */
  @ApiOperation({
    summary: 'Obtener rol por ID',
    description:
      'Retorna los datos de un rol específico junto con sus permisos asociados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del rol',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Rol encontrado exitosamente',
    schema: {
      example: {
        rolId: 1,
        nombre: 'Administrador',
        permisos: [
          {
            rolPermisoId: 1,
            permisoId: 1,
            nombre: 'Consultar Clientes',
            descripcion: 'Permite consultar registros de clientes',
            recurso: 'clientes',
            accion: 'read',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso roles:read',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @RequiredPermission('roles', 'read')
  @Get(':id')
  findOneRol(@Param('id', ParseIntPipe) id: string) {
    return this.rolesService.findOne(+id);
  }

  /**
   * Actualiza un rol: nombre, asignar y/o revocar permisos.
   * Requiere permiso: roles:update
   */
  @ApiOperation({
    summary: 'Actualizar rol',
    description:
      'Actualiza el nombre de un rol y/o asigna y revoca permisos en una sola operación.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del rol a actualizar',
    type: Number,
    example: 1,
  })
  @ApiBody({
    type: UpdateRoleDto,
    description:
      'Datos a actualizar: nombre, permisosAsignar (array de IDs), permisosRevocar (array de IDs)',
    examples: {
      soloNombre: {
        summary: 'Solo cambiar nombre',
        value: { nombre: 'Super Administrador' },
      },
      asignarPermisos: {
        summary: 'Asignar permisos',
        value: { permisosAsignar: [1, 2, 3, 4] },
      },
      revocarPermisos: {
        summary: 'Revocar permisos',
        value: { permisosRevocar: [5, 6] },
      },
      combinado: {
        summary: 'Combinado: nombre + asignar + revocar',
        value: {
          nombre: 'Editor',
          permisosAsignar: [7, 8],
          permisosRevocar: [1, 2],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso roles:update',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @RequiredPermission('roles', 'update')
  @Patch(':id')
  updateRol(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(+id, updateRoleDto);
  }
}
