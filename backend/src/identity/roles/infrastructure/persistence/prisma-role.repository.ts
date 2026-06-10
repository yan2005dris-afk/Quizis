import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { RoleRepository } from '../../domain/repositories/role.repository';
import type {
  RoleRecord,
  CreateRoleData,
  UpdateRoleData,
  RolePermissionRecord,
  RoleWithPermissions,
  RolePermissionAssignment,
} from '../../domain/repositories/role.repository';

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateRoleData): Promise<RoleRecord> {
    const role = await this.prisma.roles.create({
      data,
      select: { rolId: true, nombre: true, deletedAt: true },
    });
    return role as RoleRecord;
  }

  async findById(id: number): Promise<RoleRecord | null> {
    const role = await this.prisma.roles.findUnique({
      where: { rolId: id },
      select: { rolId: true, nombre: true, deletedAt: true },
    });
    return role as RoleRecord | null;
  }

  async findByName(name: string): Promise<RoleRecord | null> {
    const role = await this.prisma.roles.findUnique({
      where: { nombre: name },
      select: { rolId: true, nombre: true, deletedAt: true },
    });
    return role as RoleRecord | null;
  }

  async findAll(): Promise<RoleRecord[]> {
    const roles = await this.prisma.roles.findMany({
      where: { deletedAt: null },
      select: { rolId: true, nombre: true, deletedAt: true },
    });
    return roles as RoleRecord[];
  }

  async update(id: number, data: UpdateRoleData): Promise<void> {
    await this.prisma.roles.update({
      where: { rolId: id },
      data,
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.roles.update({
      where: { rolId: id },
      data: { deletedAt: new Date() },
    });
  }

  async assignPermission(rolId: number, permisoId: number): Promise<void> {
    await this.prisma.rolPermisos.upsert({
      where: { rolId_permisoId: { rolId, permisoId } },
      create: { rolId, permisoId },
      update: { deletedAt: null },
    });
  }

  async removePermission(rolId: number, permisoId: number): Promise<void> {
    await this.prisma.rolPermisos.updateMany({
      where: { rolId, permisoId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async findPermissions(rolId: number): Promise<RolePermissionRecord[]> {
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

  async findOneWithPermissions(
    id: number,
  ): Promise<RoleWithPermissions | null> {
    const role = await this.prisma.roles.findUnique({
      where: { rolId: id },
      include: {
        rolPermisos: {
          where: { deletedAt: null },
          include: {
            permiso: {
              select: {
                permisoId: true,
                nombre: true,
                descripcion: true,
                recurso: true,
                accion: true,
              },
            },
          },
          orderBy: [
            { permiso: { recurso: 'asc' } },
            { permiso: { accion: 'asc' } },
          ],
        },
      },
    });

    if (!role || role.deletedAt) return null;

    return {
      rolId: role.rolId,
      nombre: role.nombre,
      permisos: role.rolPermisos.map((rp) => ({
        rolPermisoId: rp.rolPermisoId,
        permisoId: rp.permisoId,
        nombre: rp.permiso.nombre,
        descripcion: rp.permiso.descripcion,
        recurso: rp.permiso.recurso,
        accion: rp.permiso.accion,
      })),
    };
  }

  async findOneWithPermissionsOrThrow(id: number) {
    const role = await this.findOneWithPermissions(id);
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  async findRolePermissionAssignment(
    rolId: number,
    permisoId: number,
  ): Promise<RolePermissionAssignment | null> {
    const assignment = await this.prisma.rolPermisos.findFirst({
      where: { rolId, permisoId },
    });
    return assignment as any;
  }

  async restorePermissionAssignment(
    rolId: number,
    permisoId: number,
  ): Promise<void> {
    const existing = await this.prisma.rolPermisos.findFirst({
      where: { rolId, permisoId },
    });
    if (existing) {
      await this.prisma.rolPermisos.update({
        where: { rolPermisoId: existing.rolPermisoId },
        data: { deletedAt: null },
      });
    }
  }

  async syncSequence(): Promise<void> {
    const sequenceResult = await this.prisma.$queryRaw<
      { seq: string | null }[]
    >`SELECT pg_get_serial_sequence('roles', 'rol_id') AS seq`;
    const sequenceName = sequenceResult[0]?.seq;
    if (!sequenceName) return;
    const escapedSequenceName = sequenceName.replace(/'/g, "''");
    await this.prisma.$executeRawUnsafe(
      `SELECT setval('${escapedSequenceName}', COALESCE((SELECT MAX(rol_id) FROM roles), 0) + 1, false)`,
    );
  }
}
