import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreateRoleUseCase } from './use-cases/create-role.use-case';
import { AssignPermissionToRoleUseCase } from './use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './use-cases/remove-permission-from-role.use-case';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly assignPermissionUseCase: AssignPermissionToRoleUseCase,
    private readonly removePermissionUseCase: RemovePermissionFromRoleUseCase,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    return this.createRoleUseCase.execute(createRoleDto);
  }

  findAll() {
    return this.prisma.roles.findMany({
      where: { deletedAt: null },
      select: {
        rolId: true,
        nombre: true,
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.roles.findUnique({
      where: { rolId: id },
      include: {
        rolPermisos: {
          where: { deletedAt: null },
          include: {
            permiso: {
              select: {
                permisoId: true,
                nombre: true,
                descripcion: true,
                recurso: true,
                accion: true,
              },
            },
          },
          orderBy: [
            { permiso: { recurso: 'asc' } },
            { permiso: { accion: 'asc' } },
          ],
        },
      },
    });

    if (!role || role.deletedAt) {
      throw new NotFoundException('Rol no encontrado');
    }

    return {
      rolId: role.rolId,
      nombre: role.nombre,
      permisos: role.rolPermisos.map((rp) => ({
        rolPermisoId: rp.rolPermisoId,
        permisoId: rp.permisoId,
        nombre: rp.permiso.nombre,
        descripcion: rp.permiso.descripcion,
        recurso: rp.permiso.recurso,
        accion: rp.permiso.accion,
      })),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.roles.findUnique({ where: { rolId: id } });
    if (!role || role.deletedAt) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Actualizar nombre si viene
    if (updateRoleDto.nombre !== undefined) {
      await this.prisma.roles.update({
        where: { rolId: id },
        data: { nombre: updateRoleDto.nombre },
      });
    }

    // Asignar permisos
    if (
      updateRoleDto.permisosAsignar &&
      updateRoleDto.permisosAsignar.length > 0
    ) {
      for (const permisoId of updateRoleDto.permisosAsignar) {
        try {
          await this.assignPermissionUseCase.execute(id, permisoId);
        } catch {
          // Ignorar conflictos (ya asignado)
        }
      }
    }

    // Revocar permisos
    if (
      updateRoleDto.permisosRevocar &&
      updateRoleDto.permisosRevocar.length > 0
    ) {
      for (const permisoId of updateRoleDto.permisosRevocar) {
        try {
          await this.removePermissionUseCase.execute(id, permisoId);
        } catch {
          // Ignorar si no estaba asignado
        }
      }
    }

    // Retornar rol actualizado con permisos
    return this.findOne(id);
  }
}
