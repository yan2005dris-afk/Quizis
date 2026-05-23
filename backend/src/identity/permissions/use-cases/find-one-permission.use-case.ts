import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class FindOnePermissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const permission = await this.prisma.permisos.findUnique({
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

    if (!permission || permission.deletedAt) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return permission;
  }
}
