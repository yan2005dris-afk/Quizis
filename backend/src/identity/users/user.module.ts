import { Module } from '@nestjs/common';
import { UserService } from './application/user.service';
import { UserController } from './interfaces/user.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { GetEffectivePermissionsUseCase } from './application/use-cases/get-effective-permissions.use-case';
import { UserApplicationService } from './application/user-application.service';
import { IdentityInfrastructureModule } from '../infrastructure/identity-infrastructure.module';

@Module({
  imports: [IdentityInfrastructureModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserApplicationService,
    CreateUserUseCase,
    GetEffectivePermissionsUseCase,
  ],
  exports: [
    UserService,
    UserApplicationService,
    CreateUserUseCase,
    GetEffectivePermissionsUseCase,
  ],
})
export class UserModule {}
