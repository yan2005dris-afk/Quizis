import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../domain/repositories/role.repository';
import { AssignPermissionToRoleUseCase } from './use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './use-cases/remove-permission-from-role.use-case';
import type { UpdateRoleDto } from '../interfaces/dto/update-role.dto';

@Injectable()
export class RoleApplicationService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly assignPermissionUseCase: AssignPermissionToRoleUseCase,
    private readonly removePermissionUseCase: RemovePermissionFromRoleUseCase,
  ) {}

  async findAll(): Promise<{ rolId: number; nombre: string }[]> {
    const roles = await this.roleRepo.findAll();
    return roles
      .filter((r) => !r.deletedAt)
      .map((r) => ({ rolId: r.rolId, nombre: r.nombre }));
  }

  async findOne(id: number) {
    const role = await this.roleRepo.findOneWithPermissions(id);
    if (!role || role.permisos.length === 0) {
      const basicRole = await this.roleRepo.findById(id);
      if (!basicRole || basicRole.deletedAt) {
        throw new NotFoundException('Rol no encontrado');
      }
      return {
        rolId: basicRole.rolId,
        nombre: basicRole.nombre,
        permisos: [],
      };
    }

    return {
      rolId: role.rolId,
      nombre: role.nombre,
      permisos: role.permisos.map((p) => ({
        rolPermisoId: p.rolPermisoId,
        permisoId: p.permisoId,
        nombre: p.nombre,
        descripcion: p.descripcion,
        recurso: p.recurso,
        accion: p.accion,
      })),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepo.findById(id);
    if (!role || role.deletedAt) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (updateRoleDto.nombre !== undefined) {
      await this.roleRepo.update(id, { nombre: updateRoleDto.nombre });
    }

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

    return this.findOne(id);
  }
}
