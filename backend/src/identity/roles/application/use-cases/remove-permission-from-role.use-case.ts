import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';

@Injectable()
export class RemovePermissionFromRoleUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(rolId: number, permisoId: number) {
    const assignment = await this.roleRepo.findRolePermissionAssignment(
      rolId,
      permisoId,
    );

    if (!assignment) {
      throw new NotFoundException('Permiso no asignado a este rol');
    }

    await this.roleRepo.removePermission(rolId, permisoId);
    return { permisoId };
  }
}
