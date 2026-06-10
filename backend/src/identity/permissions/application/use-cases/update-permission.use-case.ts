import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { UpdatePermissionData } from '../../domain/repositories/permission.repository';
import { UpdatePermissionDto } from '../../interfaces/dto/update-permission.dto';

@Injectable()
export class UpdatePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute(id: number, dto: UpdatePermissionDto) {
    await this.permissionRepo.update(id, dto as UpdatePermissionData);
    return this.permissionRepo.findById(id);
  }
}
