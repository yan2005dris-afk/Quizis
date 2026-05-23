import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';

@Injectable()
export class CreatePermissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(createPermissionDto: CreatePermissionDto) {
    return this.prisma.permisos.create({
      data: {
        nombre: createPermissionDto.nombre,
        descripcion: createPermissionDto.descripcion,
        recurso: createPermissionDto.recurso,
        accion: createPermissionDto.accion,
      },
    });
  }
}
