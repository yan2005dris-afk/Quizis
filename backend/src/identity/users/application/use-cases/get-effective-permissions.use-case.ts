import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

@Injectable()
export class GetEffectivePermissionsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async execute(usuarioId: number) {
    const usuario = await this.userRepo.findById(usuarioId);

    if (!usuario || usuario.deletedAt) {
      throw new NotFoundException('Usuario eliminado o no encontrado');
    }

    const rolId =
      usuario.rol && !usuario.rol.deletedAt ? usuario.rol.rolId : null;

    if (!rolId) {
      return [];
    }

    return this.roleRepo.findPermissions(rolId);
  }
}
