import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class FindAllPermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.permisos.findMany({
      where: { deletedAt: null },
      orderBy: [{ recurso: 'asc' }, { accion: 'asc' }],
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
