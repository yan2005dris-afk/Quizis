import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number, sesionId: string) {
    return this.prisma.sesiones.findFirst({
      where: {
        usuarioId,
        sesionId,
        revocado: false,
        expiraEn: { gt: new Date() },
      },
    });
  }
}
