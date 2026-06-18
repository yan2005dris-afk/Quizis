import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(rolId: number) {
    const role = await this.roleRepo.findOneWithPermissions(rolId);
    if (!role) {
      throw new NotFoundException('Rol no encontrado o eliminado');
    }

    return role.permisos.map((assignment) => ({
      rolPermisoId: assignment.rolPermisoId,
      permisoId: assignment.permisoId,
      recurso: assignment.recurso,
      accion: assignment.accion,
    }));
  }
}
