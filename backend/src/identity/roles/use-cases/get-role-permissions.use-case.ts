import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rolId: number) {
    const role = await this.prisma.roles.findUnique({ where: { rolId } });
    if (!role || role.deletedAt) {
      throw new NotFoundException('Rol no encontrado o eliminado');
    }

    const assignments = await this.prisma.rolPermisos.findMany({
      where: {
        rolId,
        deletedAt: null,
        permiso: { deletedAt: null },
      },
      orderBy: [
        { permiso: { recurso: 'asc' } },
        { permiso: { accion: 'asc' } },
      ],
      include: {
        permiso: {
          select: { permisoId: true, recurso: true, accion: true },
        },
      },
    });

    return assignments.map((assignment) => ({
      rolPermisoId: assignment.rolPermisoId,
      permisoId: assignment.permisoId,
      recurso: assignment.permiso.recurso,
      accion: assignment.permiso.accion,
    }));
  }
}
