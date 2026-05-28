import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ListAllSalasUseCase {
  private readonly logger = new Logger(ListAllSalasUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(adminId: number) {
    this.logger.log(`Listando salas para admin ${adminId}`);
    const salas = await this.prisma.salas.findMany({
      where: { deletedAt: null, adminId },
      include: {
        _count: {
          select: { participantes: true },
        },
      },
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });

    return salas.map((sala) => ({
      salaId: sala.salaId,
      nombre: sala.nombre,
      estado: sala.estado,
      participantes: sala._count.participantes,
      creadoEn: sala.createdAt.toISOString(),
    }));
  }
}
