import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

@Injectable()
export class RemovePermissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return this.prisma.permisos.update({
      where: { permisoId: id },
      data: { deletedAt: new Date() },
      select: {
        permisoId: true,
        nombre: true,
        descripcion: true,
        recurso: true,
        accion: true,
      },
    });
  }
}
