import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

/**
 * Caso de uso: Listar los bancos de preguntas disponibles.
 *
 * Retorna todos los bancos de preguntas que no han sido borrados lógicamente,
 * incluyendo la cantidad total de preguntas activas asociadas a cada banco
 * para que el profesor pueda elegir adecuadamente.
 */
@Injectable()
export class ListBancosDisponiblesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la consulta para obtener los bancos de preguntas activos.
   */
  async execute(usuarioId: number) {
    const bancos = await this.prisma.bancoPreguntas.findMany({
      where: { deletedAt: null, usuarioId },
      select: {
        bancoId: true,
        nombre: true,
        descripcion: true,
        _count: {
          select: {
            preguntas: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return bancos.map((banco) => ({
      bancoId: banco.bancoId,
      nombre: banco.nombre,
      descripcion: banco.descripcion,
      totalPreguntas: banco._count.preguntas,
    }));
  }
}
