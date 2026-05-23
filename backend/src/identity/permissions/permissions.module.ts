import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { CreatePermissionUseCase } from './use-cases/create-permission.use-case';
import { FindAllPermissionsUseCase } from './use-cases/find-all-permissions.use-case';
import { FindOnePermissionUseCase } from './use-cases/find-one-permission.use-case';
import { UpdatePermissionUseCase } from './use-cases/update-permission.use-case';
import { RemovePermissionUseCase } from './use-cases/remove-permission.use-case';

@Module({
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
