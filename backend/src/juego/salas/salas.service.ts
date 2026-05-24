import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class SalasService {
  private readonly logger = new Logger(SalasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas las salas con conteo de participantes.
   * Ordenadas por estado (jugando primero) y luego por fecha de creación descendente.
   */
  async listarTodas() {
    const salas = await this.prisma.salas.findMany({
      where: { deletedAt: null },
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

  /**
   * Obtiene una sala por ID con participantes y ronda activa.
   */
  async obtenerPorId(id: number) {
    const sala = await this.prisma.salas.findUnique({
      where: { salaId: id },
      include: {
        participantes: {
          where: { deletedAt: null },
          select: {
            participanteId: true,
            nickname: true,
            rol: true,
            isOnline: true,
          },
        },
        rondas: {
          where: { estado: 'jugando' },
          take: 1,
          select: {
            rondaId: true,
            numeroRonda: true,
            estado: true,
            fechaInicio: true,
          },
        },
      },
    });

    if (!sala || sala.deletedAt) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }

    return {
      salaId: sala.salaId,
      nombre: sala.nombre,
      estado: sala.estado,
      limitePreguntas: sala.limitePreguntas,
      tokenCompartido: sala.tokenCompartido,
      creadoEn: sala.createdAt.toISOString(),
      participantes: sala.participantes.map((p) => ({
        participanteId: p.participanteId,
        nickname: p.nickname,
        rol: p.rol,
        isOnline: p.isOnline,
      })),
      rondaActiva:
        sala.rondas.length > 0
          ? {
              rondaId: sala.rondas[0].rondaId,
              numeroRonda: sala.rondas[0].numeroRonda,
              estado: sala.rondas[0].estado,
              fechaInicio: sala.rondas[0].fechaInicio?.toISOString() ?? null,
            }
          : null,
    };
  }
}
