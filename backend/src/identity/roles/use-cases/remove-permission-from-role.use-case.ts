import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class RemovePermissionFromRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rolId: number, permisoId: number) {
    const assignment = await this.prisma.rolPermisos.findFirst({
      where: { rolId, permisoId },
    });

    if (!assignment) {
      throw new NotFoundException('Permiso no asignado a este rol');
    }

    return this.prisma.rolPermisos.update({
      where: { rolPermisoId: assignment.rolPermisoId },
      data: { deletedAt: new Date() },
      select: { permisoId: true },
    });
  }
}
