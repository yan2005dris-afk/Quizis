import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

export interface UserRolePermission {
  recurso: string;
  accion: string;
}

@Injectable()
export class GetUserRolePermissionsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async execute(usuarioId: number): Promise<UserRolePermission[]> {
    const user = await this.userRepo.findById(usuarioId);

    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado o eliminado');
    }

    if (!user.rol || user.rol.deletedAt) {
      return [];
    }

    return this.roleRepo.findPermissions(user.rol.rolId);
  }
}
