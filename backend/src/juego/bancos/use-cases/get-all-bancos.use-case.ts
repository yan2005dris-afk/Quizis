import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class GetAllBancosUseCase {
  private readonly logger = new Logger(GetAllBancosUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number) {
    this.logger.log(`Buscando bancos de preguntas para usuario ${usuarioId}`);
    return this.prisma.bancoPreguntas.findMany({
      where: { usuarioId, deletedAt: null },
      include: {
        _count: {
          select: { preguntas: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
