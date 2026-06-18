import { Injectable } from '@nestjs/common';
import {
  PermissionRepository,
} from '../../domain/repositories/permission.repository';
import type { CreatePermissionData } from '../../domain/repositories/permission.repository';
import type { CreatePermissionDto } from '../../interfaces/dto/create-permission.dto';

@Injectable()
export class CreatePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute(dto: CreatePermissionDto) {
    return this.permissionRepo.create(dto as CreatePermissionData);
  }
}
