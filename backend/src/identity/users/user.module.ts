import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { GetEffectivePermissionsUseCase } from './use-cases/get-effective-permissions.use-case';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, CreateUserUseCase, GetEffectivePermissionsUseCase],
  exports: [UserService, CreateUserUseCase, GetEffectivePermissionsUseCase],
})
export class UserModule {}
