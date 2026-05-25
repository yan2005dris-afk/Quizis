import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class GetSalaDetailUseCase {
  private readonly logger = new Logger(GetSalaDetailUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(idOrToken: number | string) {
    this.logger.log(`Obteniendo detalle de sala: ${idOrToken}`);
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

    const onlineNicknames = await this.cacheService.getOnlineParticipants(
      sala.tokenCompartido,
    );
    const onlineSet = new Set(onlineNicknames);

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
        isOnline: onlineSet.has(p.nickname),
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
}
