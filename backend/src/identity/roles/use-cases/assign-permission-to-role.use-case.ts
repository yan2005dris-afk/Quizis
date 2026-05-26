import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

@Injectable()
export class AssignPermissionToRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rolId: number, permisoId: number) {
    const role = await this.prisma.roles.findUnique({ where: { rolId } });
    if (!role || role.deletedAt)
      throw new NotFoundException('Rol no encontrado o eliminado');

    const permission = await this.prisma.permisos.findUnique({
      where: { permisoId },
    });
    if (!permission || permission.deletedAt)
      throw new NotFoundException('Permiso no encontrado o eliminado');

    const existing = await this.prisma.rolPermisos.findFirst({
      where: { rolId, permisoId },
    });

    if (existing) {
      if (existing.deletedAt) {
        return this.prisma.rolPermisos.update({
          where: { rolPermisoId: existing.rolPermisoId },
          data: { deletedAt: null },
        });
      }
      throw new ConflictException('El rol ya tiene ese permiso asignado');
    }

    return this.prisma.rolPermisos.create({
      data: { rolId, permisoId },
    });
  }
}
