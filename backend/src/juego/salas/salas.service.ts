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
   * Obtiene una sala por ID o Token Compartido, con participantes y ronda activa.
   */
  async obtenerPorId(idOrToken: number | string) {
    const isToken = typeof idOrToken === 'string' && isNaN(Number(idOrToken));

    const sala = await this.prisma.salas.findUnique({
      where: isToken
        ? { tokenCompartido: idOrToken as string }
        : { salaId: Number(idOrToken) },
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
            preguntaActualId: true,
            preguntasAsignadas: true,
          },
        },
      },
    });

    if (!sala || sala.deletedAt) {
      throw new NotFoundException(
        `Sala con ${isToken ? 'token' : 'ID'} ${idOrToken} no encontrada`,
      );
    }

    // Si hay una ronda activa, traer los detalles de TODAS sus preguntas y respuestas
    let historialPreguntas: any[] = [];
    if (sala.rondas.length > 0) {
      const ronda = sala.rondas[0];
      const preguntasIds = (ronda.preguntasAsignadas as number[]) || [];

      const preguntas = await this.prisma.preguntas.findMany({
        where: { preguntaId: { in: preguntasIds } },
        include: { opciones: true },
      });

      const respuestas = await this.prisma.respuestasRonda.findMany({
        where: { rondaId: ronda.rondaId },
      });

      // Ordenamos las preguntas según el orden de preguntasAsignadas
      historialPreguntas = preguntasIds
        .map((id) => {
          const p = preguntas.find((pre) => pre.preguntaId === id);
          if (!p) return null;

          const respuesta = respuestas.find((r) => r.preguntaId === id);

          return {
            preguntaId: p.preguntaId,
            texto: p.texto,
            nivel: p.nivel,
            monto: p.monto,
            opciones: p.opciones.map((o, index) => ({
              opcionId: o.opcionId,
              texto: o.texto,
              letra: String.fromCharCode(65 + index),
            })),
            respuestaDada: respuesta
              ? {
                  opcionId: respuesta.opcionId,
                  esCorrecta: respuesta.esCorrecta,
                }
              : null,
          };
        })
        .filter((p) => p !== null);
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
              preguntaActualId: sala.rondas[0].preguntaActualId,
              preguntaActual:
                historialPreguntas.find(
                  (p) => p.preguntaId === sala.rondas[0].preguntaActualId,
                ) || null,
              historialPreguntas,
            }
          : null,
    };
  }

  /**
   * Obtiene los comodines de una sala específica (por ID o Token).
   */
  async obtenerComodines(idOrToken: number | string) {
    const isToken = typeof idOrToken === 'string' && isNaN(Number(idOrToken));

    // Si es token, primero necesitamos el ID real de la sala
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
            nombre: true,
            descripcion: true,
            icono: true,
          },
        },
      },
    });

    return salaComodines.map((sc) => ({
      nombre: sc.comodin.nombre,
      descripcion: sc.comodin.descripcion,
      icono: sc.comodin.icono,
      activo: sc.activo,
    }));
  }
}
