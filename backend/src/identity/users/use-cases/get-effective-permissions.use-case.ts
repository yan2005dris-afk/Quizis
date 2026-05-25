import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

@Injectable()
export class GetEffectivePermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { usuarioId },
      include: {
        rol: { select: { rolId: true, deletedAt: true } },
      },
    });

    if (!usuario || usuario.deletedAt) {
      throw new NotFoundException('Usuario eliminado o no encontrado');
    }

    const rolId =
      usuario.rol && !usuario.rol.deletedAt ? usuario.rol.rolId : null;

    if (!rolId) {
      return [];
    }

    const rolePermissionAssignments = await this.prisma.rolPermisos.findMany({
      where: {
        deletedAt: null,
        rolId: rolId,
        permiso: { deletedAt: null },
      },
      include: {
        permiso: { select: { recurso: true, accion: true } },
      },
    });

    return rolePermissionAssignments.map((rp) => ({
      recurso: rp.permiso.recurso,
      accion: rp.permiso.accion,
    }));
  }
}
