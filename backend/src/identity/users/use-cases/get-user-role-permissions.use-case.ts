import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

export interface UserRolePermission {
  recurso: string;
  accion: string;
}

@Injectable()
export class GetUserRolePermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number): Promise<UserRolePermission[]> {
    const user = await this.prisma.usuarios.findUnique({
      where: { usuarioId },
      include: {
        rol: { select: { rolId: true, deletedAt: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado o eliminado');
    }

    if (!user.rol || user.rol.deletedAt) {
      return [];
    }

    const assignments = await this.prisma.rolPermisos.findMany({
      where: {
        rolId: user.rol.rolId,
        deletedAt: null,
        permiso: { deletedAt: null },
      },
      include: {
        permiso: { select: { recurso: true, accion: true } },
      },
    });

    return assignments.map((rp) => ({
      recurso: rp.permiso.recurso,
      accion: rp.permiso.accion,
    }));
  }
}
