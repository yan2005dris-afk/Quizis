import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UpdateSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(sesionId: string, data: Prisma.SesionesUpdateInput) {
    return this.prisma.sesiones.update({
      where: { sesionId },
      data,
    });
  }
}
