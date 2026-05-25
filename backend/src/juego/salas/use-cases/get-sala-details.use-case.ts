import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Caso de uso: Obtener los detalles completos de una sala de juego.
 *
 * Retorna la información de la sala junto con el catálogo de comodines
 * y el estado activo/inactivo de cada uno en esta sala.
 */
@Injectable()
export class GetSalaDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la consulta para obtener los detalles de la sala.
   * @param id - ID de la sala a consultar.
   * @throws NotFoundException si la sala no existe o está borrada lógicamente.
   */
  async execute(id: number) {
    const sala = await this.prisma.salas.findUnique({
      where: { salaId: id },
      include: {
        comodines: {
          include: {
            comodin: true,
          },
        },
      },
    });

    if (!sala || sala.deletedAt) {
      throw new NotFoundException('Sala no encontrada');
    }

    return {
      salaId: sala.salaId,
      adminId: sala.adminId,
      bancoId: sala.bancoId,
      nombre: sala.nombre,
      tokenCompartido: sala.tokenCompartido,
      estado: sala.estado,
      limitePreguntas: sala.limitePreguntas,
      createdAt: sala.createdAt,
      comodines: sala.comodines.map((sc) => ({
        comodinId: sc.comodin.comodinId,
        nombre: sc.comodin.nombre,
        descripcion: sc.comodin.descripcion,
        activo: sc.activo,
      })),
    };
  }
}
