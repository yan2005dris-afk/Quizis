import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

@Injectable()
export class UpdatePermissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, updatePermissionDto: UpdatePermissionDto) {
    return this.prisma.permisos.update({
      where: { permisoId: id },
      data: {
        nombre: updatePermissionDto.nombre,
        descripcion: updatePermissionDto.descripcion,
        recurso: updatePermissionDto.recurso,
        accion: updatePermissionDto.accion,
      },
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
