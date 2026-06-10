import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

@Injectable()
export class GetSalaLifelinesUseCase {
  private readonly logger = new Logger(GetSalaLifelinesUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(idOrToken: number | string) {
    this.logger.log(`Obteniendo comodines de sala: ${idOrToken}`);
    const isToken = typeof idOrToken === 'string' && isNaN(Number(idOrToken));

    let salaId: number;

    if (isToken) {
      const sala = await this.prisma.salas.findUnique({
        where: { tokenCompartido: idOrToken as string },
        select: { salaId: true },
      });
      if (!sala) throw new NotFoundException('Sala no encontrada');
      salaId = sala.salaId;
    } else {
      salaId = Number(idOrToken);
    }

    const salaComodines = await this.prisma.salaComodines.findMany({
      where: { salaId },
      include: {
        comodin: {
          select: {
            comodinId: true,
            nombre: true,
            descripcion: true,
            icono: true,
          },
        },
      },
    });

    return salaComodines.map((sc) => ({
      comodinId: sc.comodin.comodinId,
      nombre: sc.comodin.nombre,
      descripcion: sc.comodin.descripcion,
      icono: sc.comodin.icono,
      activo: sc.activo,
    }));
  }
}
