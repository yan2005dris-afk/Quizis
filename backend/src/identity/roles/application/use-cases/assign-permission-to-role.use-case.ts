import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PermissionRepository } from '../../../permissions/domain/repositories/permission.repository';

@Injectable()
export class AssignPermissionToRoleUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
  ) {}

  async execute(rolId: number, permisoId: number) {
    const role = await this.roleRepo.findById(rolId);
    if (!role || role.deletedAt)
      throw new NotFoundException('Rol no encontrado o eliminado');

    const permission = await this.permissionRepo.findById(permisoId);
    if (!permission || permission.deletedAt)
      throw new NotFoundException('Permiso no encontrado o eliminado');

    const existing = await this.roleRepo.findRolePermissionAssignment(
      rolId,
      permisoId,
    );

    if (existing) {
      if (existing.deletedAt) {
        await this.roleRepo.restorePermissionAssignment(rolId, permisoId);
        const restored = await this.roleRepo.findRolePermissionAssignment(
          rolId,
          permisoId,
        );
        if (!restored) {
          throw new Error('No se pudo restaurar la asignación del permiso');
        }
        return restored;
      }
      throw new ConflictException('El rol ya tiene ese permiso asignado');
    }

    await this.roleRepo.assignPermission(rolId, permisoId);
    const created = await this.roleRepo.findRolePermissionAssignment(
      rolId,
      permisoId,
    );
    if (!created) {
      throw new Error('No se pudo confirmar la asignación del permiso');
    }
    return created;
  }
}
