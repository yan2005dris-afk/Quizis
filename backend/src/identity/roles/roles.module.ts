import { Module } from '@nestjs/common';
import { RolesService } from './application/roles.service';
import { RolesController } from './interfaces/roles.controller';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { AssignPermissionToRoleUseCase } from './application/use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './application/use-cases/remove-permission-from-role.use-case';
import { RoleApplicationService } from './application/role-application.service';
import { IdentityInfrastructureModule } from '../infrastructure/identity-infrastructure.module';

@Module({
  imports: [IdentityInfrastructureModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    RoleApplicationService,
    CreateRoleUseCase,
    AssignPermissionToRoleUseCase,
    RemovePermissionFromRoleUseCase,
  ],
  exports: [
    RoleApplicationService,
    CreateRoleUseCase,
    AssignPermissionToRoleUseCase,
    RemovePermissionFromRoleUseCase,
  ],
})
export class RolesModule {}
