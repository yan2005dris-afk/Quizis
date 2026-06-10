import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

@Injectable()
export class FindAllPermissionsUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute() {
    return this.permissionRepo.findAll();
  }
}
