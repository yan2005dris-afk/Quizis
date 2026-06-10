import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

const ESTADO_MAP: Record<string, string> = {
  BORRADOR: 'borrador',
  ESPERANDO_ALUMNOS: 'esperando',
  EN_VIVO: 'jugando',
  FINALIZADO: 'terminado',
};

const SORT_ORDER: Record<string, number> = {
  jugando: 0,
  esperando: 1,
  borrador: 2,
  terminado: 3,
};

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

    const mapped = salas.map((sala) => ({
      salaId: sala.salaId,
      nombre: sala.nombre,
      estado: ESTADO_MAP[sala.estado] ?? sala.estado,
      participantes: sala._count.participantes,
      creadoEn: sala.createdAt.toISOString(),
    }));

    // Sort: jugando → esperando → borrador → terminado
    mapped.sort(
      (a, b) => (SORT_ORDER[a.estado] ?? 99) - (SORT_ORDER[b.estado] ?? 99),
    );

    return mapped;
  }
}
