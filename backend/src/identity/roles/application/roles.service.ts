import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from '../interfaces/dto/create-role.dto';
import { UpdateRoleDto } from '../interfaces/dto/update-role.dto';
import { RoleApplicationService } from './role-application.service';
import { CreateRoleUseCase } from './use-cases/create-role.use-case';

@Injectable()
export class RolesService {
  constructor(
    private readonly roleAppService: RoleApplicationService,
    private readonly createRoleUseCase: CreateRoleUseCase,
  ) {}

  create(createRoleDto: CreateRoleDto) {
    return this.createRoleUseCase.execute(createRoleDto);
  }

  findAll(): Promise<{ rolId: number; nombre: string }[]> {
    return this.roleAppService.findAll();
  }

  findOne(id: number) {
    return this.roleAppService.findOne(id);
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.roleAppService.update(id, updateRoleDto);
  }
}
