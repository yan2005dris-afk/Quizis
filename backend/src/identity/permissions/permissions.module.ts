import { Module } from '@nestjs/common';
import { PermissionsService } from './application/permissions.service';
import { PermissionsController } from './interfaces/permissions.controller';
import { IdentityInfrastructureModule } from '../infrastructure/identity-infrastructure.module';
import { CreatePermissionUseCase } from './application/use-cases/create-permission.use-case';
import { FindAllPermissionsUseCase } from './application/use-cases/find-all-permissions.use-case';
import { FindOnePermissionUseCase } from './application/use-cases/find-one-permission.use-case';
import { UpdatePermissionUseCase } from './application/use-cases/update-permission.use-case';
import { RemovePermissionUseCase } from './application/use-cases/remove-permission.use-case';

@Module({
  imports: [IdentityInfrastructureModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    CreatePermissionUseCase,
    FindAllPermissionsUseCase,
    FindOnePermissionUseCase,
    UpdatePermissionUseCase,
    RemovePermissionUseCase,
  ],
  exports: [
    CreatePermissionUseCase,
    FindAllPermissionsUseCase,
    FindOnePermissionUseCase,
    UpdatePermissionUseCase,
    RemovePermissionUseCase,
  ],
})
export class PermissionsModule {}
