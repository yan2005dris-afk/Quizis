import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class GetAllBancosUseCase {
  private readonly logger = new Logger(GetAllBancosUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    this.logger.log('Buscando todos los bancos de preguntas');
    return this.prisma.bancoPreguntas.findMany({
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
