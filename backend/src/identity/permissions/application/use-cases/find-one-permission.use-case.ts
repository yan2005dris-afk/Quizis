import { Injectable, NotFoundException } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

@Injectable()
export class FindOnePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute(id: number) {
    const permission = await this.permissionRepo.findById(id);

    if (!permission || permission.deletedAt) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return permission;
  }
}
