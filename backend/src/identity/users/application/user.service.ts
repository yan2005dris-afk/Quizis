import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserApplicationService } from './user-application.service';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { GetEffectivePermissionsUseCase } from './use-cases/get-effective-permissions.use-case';
import { CreateUserDto } from '../interfaces/dto/create-user.dto';
import { UpdateUserDto } from '../interfaces/dto/update-user.dto';
import type { PaginatedResult } from 'src/core/common/types/paginated-result.type';
import type { PaginationDto } from 'src/core/common/dtos/pagination.dto';
import type {
  UserWithPermissionsResponse,
  UserWithRoleResponse,
  ProfileResponse,
  EffectivePermissionsResponse,
} from '../interfaces/types/user.types';

@Injectable()
export class UserService {
  constructor(
    private readonly userAppService: UserApplicationService,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getEffectivePermissionsUseCase: GetEffectivePermissionsUseCase,
  ) {}

  async user(
    userWhereUniqueInput: { usuarioId?: number; email?: string },
  ): Promise<UserWithPermissionsResponse | null> {
    return this.userAppService.findByUniqueInput(userWhereUniqueInput);
  }

  async findMe(usersId: number): Promise<ProfileResponse> {
    return this.userAppService.findMe(usersId);
  }

  async users(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<UserWithRoleResponse>> {
    return this.userAppService.listUsers(pagination);
  }

  async createUser(createUsersDto: CreateUserDto) {
    return this.createUserUseCase.execute(createUsersDto);
  }

  async updateUser(params: {
    where: { usuarioId?: number; email?: string };
    data: UpdateUserDto;
  }): Promise<UserWithPermissionsResponse | null> {
    const id = params.where.usuarioId;
    if (id === undefined) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.userAppService.updateUser(id, params.data);
  }

  async softDeleteUser(where: { usuarioId?: number }) {
    const id = where.usuarioId;
    if (id === undefined) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.userAppService.softDeleteUser(id);
  }

  async getEffectivePermissions(
    usuarioId: number,
  ): Promise<EffectivePermissionsResponse> {
    const permissions =
      await this.getEffectivePermissionsUseCase.execute(usuarioId);
    return {
      usuarioId,
      permisos: permissions.map((p) => ({
        recurso: p.recurso,
        accion: p.accion,
      })),
    };
  }
}
