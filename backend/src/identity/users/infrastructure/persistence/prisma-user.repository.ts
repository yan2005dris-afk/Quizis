import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import type {
  UserRecord,
  CreateUserData,
  UpdateUserData,
  PaginatedResult,
} from '../../domain/repositories/user.repository';
import { paginate } from '../../../../core/common/utils/pagination.util';

const USER_WITH_ROLE_SELECT = {
  usuarioId: true,
  email: true,
  clave: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  avatar: true,
  rolId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  rol: { select: { rolId: true, nombre: true, deletedAt: true } },
} as const;

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.usuarios.findUnique({
      where: { email },
      select: USER_WITH_ROLE_SELECT,
    });
    if (!user || user.deletedAt) return null;
    return user as unknown as UserRecord;
  }

  async findByEmailIncludingDeleted(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.usuarios.findUnique({
      where: { email },
      select: USER_WITH_ROLE_SELECT,
    });
    return user as unknown as UserRecord | null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const user = await this.prisma.usuarios.findUnique({
      where: { usuarioId: id },
      select: USER_WITH_ROLE_SELECT,
    });
    if (!user || user.deletedAt) return null;
    return user as unknown as UserRecord;
  }

  async findByUniqueInput(input: {
    usuarioId?: number;
    email?: string;
  }): Promise<UserRecord | null> {
    const where: any = {};
    if (input.usuarioId !== undefined) where.usuarioId = input.usuarioId;
    if (input.email !== undefined) where.email = input.email;

    const user = await this.prisma.usuarios.findUnique({
      where,
      select: USER_WITH_ROLE_SELECT,
    });
    if (!user || user.deletedAt) return null;
    return user as unknown as UserRecord;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const user = await this.prisma.usuarios.create({
      data: {
        email: data.email,
        clave: data.clave,
        nombres: data.nombres,
        apellidos: data.apellidos,
        telefono: data.telefono,
        avatar: data.avatar as any,
        rolId: data.rolId,
      },
      select: USER_WITH_ROLE_SELECT,
    });
    return user as unknown as UserRecord;
  }

  async update(id: number, data: UpdateUserData): Promise<void> {
    await this.prisma.usuarios.update({
      where: { usuarioId: id },
      data: data as any,
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.usuarios.update({
      where: { usuarioId: id },
      data: { deletedAt: new Date() },
    });
  }

  async paginate(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<UserRecord>> {
    const result = await paginate(
      this.prisma.usuarios,
      {
        select: USER_WITH_ROLE_SELECT,
        where: { deletedAt: null },
        orderBy: { usuarioId: 'asc' } as any,
      },
      { page: params.page, limit: params.limit },
    );

    return {
      data: result.data as unknown as UserRecord[],
      meta: result.meta as PaginatedResult<UserRecord>['meta'],
    };
  }
}
