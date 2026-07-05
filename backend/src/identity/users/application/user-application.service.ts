import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '../domain/repositories/user.repository';
import { RoleRepository } from '../../roles/domain/repositories/role.repository';
import { ValidationUtil } from 'src/core/common/utils/validation.util';
import { PhoneUtil } from 'src/core/common/utils/phone.util';
import type { PaginatedResult } from 'src/core/common/types/paginated-result.type';
import type { PaginationDto } from 'src/core/common/dtos/pagination.dto';
import type {
  UserWithPermissionsResponse,
  UserWithRoleResponse,
  ProfileResponse,
} from '../interfaces/types/user.types';

@Injectable()
export class UserApplicationService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async findByUniqueInput(input: {
    usuarioId?: number;
    email?: string;
  }): Promise<UserWithPermissionsResponse | null> {
    const user = await this.userRepo.findByUniqueInput(input);
    if (!user || user.deletedAt) return null;

    const permissions =
      user.rol && !user.rol.deletedAt
        ? await this.roleRepo.findPermissions(user.rol.rolId)
        : [];

    return {
      usuarioId: user.usuarioId,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      telefono: user.telefono,
      avatar: user.avatar,
      rol:
        user.rol && !user.rol.deletedAt
          ? { rolId: user.rol.rolId, nombre: user.rol.nombre }
          : null,
      permisosRol: permissions.map((p) => ({
        recurso: p.recurso,
        accion: p.accion,
      })),
    };
  }

  async findById(id: number): Promise<UserWithPermissionsResponse | null> {
    return this.findByUniqueInput({ usuarioId: id });
  }

  async findMe(id: number): Promise<ProfileResponse> {
    const user = await this.userRepo.findByUniqueInput({ usuarioId: id });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado o eliminado');
    }

    const fullName = [user.nombres, user.apellidos].filter(Boolean).join(' ');
    const avatarObj = user.avatar as { url?: string; key?: string } | null;

    return {
      usuarioId: user.usuarioId,
      email: user.email,
      nombre: fullName || null,
      telefono: user.telefono,
      avatar: avatarObj,
      rol:
        user.rol && !user.rol.deletedAt
          ? { rolId: user.rol.rolId, nombre: user.rol.nombre }
          : null,
    };
  }

  async listUsers(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<UserWithRoleResponse>> {
    const rawResult = await this.userRepo.paginate({
      page: pagination.page ?? 1,
      limit: pagination.limit ?? 10,
    });

    return {
      data: rawResult.data.map((user: any) => ({
        usuarioId: user.usuarioId,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
        avatar: user.avatar,
        rol:
          user.rol && !user.rol.deletedAt
            ? { rolId: user.rol.rolId, nombre: user.rol.nombre }
            : null,
      })),
      meta: rawResult.meta,
    };
  }

  async updateUser(
    id: number,
    data: {
      email?: string;
      nombres?: string;
      apellidos?: string;
      telefono?: string;
      avatar?: unknown;
      rolId?: number | null;
      clave?: string;
    },
  ): Promise<UserWithPermissionsResponse | null> {
    const existingUser = await this.userRepo.findByUniqueInput({
      usuarioId: id,
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (existingUser.deletedAt) {
      throw new BadRequestException(
        'No se puede modificar un usuario eliminado',
      );
    }

    if (data.nombres !== undefined) {
      ValidationUtil.requireNonEmpty(data.nombres, 'nombres');
    }
    if (data.apellidos !== undefined) {
      ValidationUtil.requireNonEmpty(data.apellidos, 'apellidos');
    }
    if (data.email !== undefined) {
      ValidationUtil.requireNonEmpty(data.email, 'email');
    }
    if (data.telefono !== undefined) {
      ValidationUtil.requireNonEmpty(data.telefono, 'telefono');
      data.telefono = PhoneUtil.validateAndClean(data.telefono, 'telefono');
    }

    if (data.rolId !== undefined && data.rolId !== null) {
      const role = await this.roleRepo.findById(data.rolId as number);
      if (!role || role.deletedAt) {
        throw new NotFoundException('Rol no encontrado o eliminado');
      }
    }

    await this.userRepo.update(id, {
      email: data.email,
      nombres: data.nombres,
      apellidos: data.apellidos,
      telefono: data.telefono,
      avatar: data.avatar,
      rolId: data.rolId,
    });

    return this.findById(id);
  }

  async softDeleteUser(id: number) {
    const user = await this.userRepo.findByUniqueInput({ usuarioId: id });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado o eliminado');
    }

    await this.userRepo.softDelete(id);

    return {
      usuarioId: user.usuarioId,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      telefono: user.telefono,
      avatar: user.avatar,
    };
  }
}
