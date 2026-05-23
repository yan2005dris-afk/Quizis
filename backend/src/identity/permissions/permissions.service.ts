import { Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CreatePermissionUseCase } from './use-cases/create-permission.use-case';
import { FindAllPermissionsUseCase } from './use-cases/find-all-permissions.use-case';
import { FindOnePermissionUseCase } from './use-cases/find-one-permission.use-case';
import { UpdatePermissionUseCase } from './use-cases/update-permission.use-case';
import { RemovePermissionUseCase } from './use-cases/remove-permission.use-case';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly createUseCase: CreatePermissionUseCase,
    private readonly findAllUseCase: FindAllPermissionsUseCase,
    private readonly findOneUseCase: FindOnePermissionUseCase,
    private readonly updateUseCase: UpdatePermissionUseCase,
    private readonly removeUseCase: RemovePermissionUseCase,
  ) {}

  create(createPermissionDto: CreatePermissionDto) {
    return this.createUseCase.execute(createPermissionDto);
  }

  findAll() {
    return this.findAllUseCase.execute();
  }

  findOne(id: number) {
    return this.findOneUseCase.execute(id);
  }

  update(id: number, updatePermissionDto: UpdatePermissionDto) {
    return this.updateUseCase.execute(id, updatePermissionDto);
  }

  remove(id: number) {
    return this.removeUseCase.execute(id);
  }
}
