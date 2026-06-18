import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

@Injectable()
export class RemovePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute(id: number) {
    await this.permissionRepo.remove(id);
    return { deleted: true };
  }
}
