import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import type {
  PermissionRecord,
  CreatePermissionData,
  UpdatePermissionData,
  RolePermissionRecord,
} from '../../domain/repositories/permission.repository';

@Injectable()
export class PrismaPermissionRepository extends PermissionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreatePermissionData): Promise<PermissionRecord> {
    const perm = await this.prisma.permisos.create({
      data,
      select: {
        permisoId: true,
        nombre: true,
        descripcion: true,
        recurso: true,
        accion: true,
        deletedAt: true,
      },
    });
    return perm as PermissionRecord;
  }

  async findById(id: number): Promise<PermissionRecord | null> {
    const perm = await this.prisma.permisos.findUnique({
      where: { permisoId: id },
      select: {
        permisoId: true,
        nombre: true,
        descripcion: true,
        recurso: true,
        accion: true,
        deletedAt: true,
      },
    });
    return perm as PermissionRecord | null;
  }

  async findAll(): Promise<PermissionRecord[]> {
    const perms = await this.prisma.permisos.findMany({
      where: { deletedAt: null },
      orderBy: [{ recurso: 'asc' }, { accion: 'asc' }],
      select: {
        permisoId: true,
        nombre: true,
        descripcion: true,
        recurso: true,
        accion: true,
        deletedAt: true,
      },
    });
    return perms as PermissionRecord[];
  }

  async update(id: number, data: UpdatePermissionData): Promise<void> {
    await this.prisma.permisos.update({
      where: { permisoId: id },
      data,
    });
  }

  async remove(id: number): Promise<void> {
    await this.prisma.permisos.update({
      where: { permisoId: id },
      data: { deletedAt: new Date() },
    });
  }

  async findByRoleId(rolId: number): Promise<RolePermissionRecord[]> {
    const rows = await this.prisma.rolPermisos.findMany({
      where: { rolId, deletedAt: null, permiso: { deletedAt: null } },
      orderBy: [
        { permiso: { recurso: 'asc' } },
        { permiso: { accion: 'asc' } },
      ],
      include: { permiso: { select: { recurso: true, accion: true } } },
    });
    return rows.map((r) => ({
      recurso: r.permiso.recurso,
      accion: r.permiso.accion,
    }));
  }
}
