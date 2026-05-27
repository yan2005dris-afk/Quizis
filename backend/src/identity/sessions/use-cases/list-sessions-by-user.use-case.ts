import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

@Injectable()
export class ListSessionsByUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number) {
    return this.prisma.sesiones.findMany({
      where: {
        usuarioId,
        revocado: false,
        expiraEn: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
