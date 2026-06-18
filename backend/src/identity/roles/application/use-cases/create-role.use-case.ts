import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from '../../interfaces/dto/create-role.dto';
import {
  RoleRepository,
} from '../../domain/repositories/role.repository';
import type { CreateRoleData } from '../../domain/repositories/role.repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(createRoleDto: CreateRoleDto) {
    const roleData = { nombre: createRoleDto.nombre } satisfies CreateRoleData;

    try {
      return await this.roleRepo.create(roleData);
    } catch (error: any) {
      if (this.isRolesIdUniqueConstraintError(error)) {
        await this.roleRepo.syncSequence();
        return await this.roleRepo.create(roleData);
      }
      throw error;
    }
  }

  private isRolesIdUniqueConstraintError(error: any): boolean {
    if (!error || typeof error !== 'object') return false;
    if (error.code !== 'P2002') return false;
    const target = error.meta?.target;
    if (Array.isArray(target) && target.some((field) => field === 'roles_id'))
      return true;
    const driverFields =
      error.meta?.driverAdapterError?.cause?.constraint?.fields;
    if (
      Array.isArray(driverFields) &&
      driverFields.some((field) => field === 'roles_id')
    )
      return true;
    return false;
  }
}
