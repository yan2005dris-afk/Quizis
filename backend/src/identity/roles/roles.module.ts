import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { CreateRoleUseCase } from './use-cases/create-role.use-case';
import { AssignPermissionToRoleUseCase } from './use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './use-cases/remove-permission-from-role.use-case';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    CreateRoleUseCase,
    AssignPermissionToRoleUseCase,
    RemovePermissionFromRoleUseCase,
  ],
  exports: [
    CreateRoleUseCase,
    AssignPermissionToRoleUseCase,
    RemovePermissionFromRoleUseCase,
  ],
})
export class RolesModule {}
