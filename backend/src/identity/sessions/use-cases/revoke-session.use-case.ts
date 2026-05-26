import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

@Injectable()
export class RevokeSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(sesionId: string) {
    return this.prisma.sesiones.update({
      where: { sesionId },
      data: { revocado: true },
    });
  }
}
