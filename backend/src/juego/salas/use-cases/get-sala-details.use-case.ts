import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheService } from '../cache/participants-cache.service';
import { RoomStateCacheService } from '../cache/room-state-cache.service';

// ── Tipos locales para las funciones puras de mapeo ──

interface ParticipanteRow {
  participanteId: number;
  nickname: string;
  rol: string;
}

interface ComodinRow {
  activo: boolean;
  comodin: {
    comodinId: number;
    nombre: string;
    descripcion: string;
    icono: string;
  };
}

interface RondaRow {
  rondaId: number;
  numeroRonda: number;
  estado: string;
  fechaInicio: Date | null;
  preguntaActualId: number | null;
  preguntasAsignadas: number[];
}

type SalaWithRelations = Record<string, unknown> & {
  salaId: number;
  adminId: number;
  bancoId: number;
  nombre: string;
  estado: string;
  maxEstudiantes: number;
  limitePreguntas: number;
  tokenCompartido: string;
  createdAt: Date;
  participantes: ParticipanteRow[];
  comodines: ComodinRow[];
  rondas: RondaRow[];
};

/**
 * Caso de uso: Obtener los detalles completos de una sala de juego.
 *
 * Provee una visión unificada tanto para administración como para gameplay,
 * incluyendo participantes, rondas activas, historial y comodines.
 */
@Injectable()
export class GetSalaDetailsUseCase {
  private readonly logger = new Logger(GetSalaDetailsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ParticipantsCacheService,
    private readonly roomStateCache: RoomStateCacheService,
  ) {}

  /**
   * Ejecuta la consulta para obtener los detalles de la sala.
   * @param idOrToken - ID (number) o Token (string) de la sala.
   * @throws NotFoundException si la sala no existe o está borrada.
   */
  async execute(idOrToken: number | string) {
    this.logger.log(`Obteniendo detalles de sala: ${idOrToken}`);

    const isToken = typeof idOrToken === 'string' && isNaN(Number(idOrToken));

    // 1. Buscar la sala con todas sus relaciones necesarias
    const sala = await this.fetchSala(idOrToken, isToken);

    // 2. Procesar historial de preguntas si hay ronda activa
    const historialPreguntas = await this.buildHistorialPreguntas(sala);

    // 3. Estado real desde Redis (sobrescribe Postgres que puede estar desactualizado)
    const estadoRedis = await this.roomStateCache.getRoomEstado(
      sala.tokenCompartido,
    );
    const estadoActual = (estadoRedis ?? sala.estado) as string;

    // 4. Obtener estado online desde Redis
    const onlineNicknames = await this.cacheService.getOnlineParticipants(
      sala.tokenCompartido,
    );
    const onlineSet = new Set(onlineNicknames);

    // 5. Mapear respuesta final
    return this.toResponse(sala, estadoActual, onlineSet, historialPreguntas);
  }

  // ── Helpers ──

  private async fetchSala(idOrToken: number | string, isToken: boolean) {
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
        comodines: {
          include: {
            comodin: true,
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

    return sala as unknown as SalaWithRelations;
  }

  private async buildHistorialPreguntas(sala: SalaWithRelations) {
    if (sala.rondas.length === 0) return [];

    const ronda = sala.rondas[0];
    const preguntasIds = (ronda.preguntasAsignadas as number[]) || [];

    const preguntas = await this.prisma.preguntas.findMany({
      where: { preguntaId: { in: preguntasIds } },
      select: {
        preguntaId: true,
        texto: true,
        nivel: true,
        monto: true,
        feedbackCorrecto: true,
        feedbackIncorrecto: true,
        opciones: {
          select: { opcionId: true, texto: true, esCorrecta: true },
        },
      },
    });

    const respuestas = await this.prisma.respuestasRonda.findMany({
      where: { rondaId: ronda.rondaId },
    });

    return preguntasIds
      .map((id) => {
        const p = preguntas.find((pre) => pre.preguntaId === id);
        if (!p) return null;

        const respuesta = respuestas.find((r) => r.preguntaId === id);

        return {
          preguntaId: p.preguntaId,
          texto: p.texto,
          nivel: p.nivel,
          monto: p.monto,
          feedbackCorrecto: p.feedbackCorrecto,
          feedbackIncorrecto: p.feedbackIncorrecto,
          opciones: p.opciones.map((o, index) => ({
            opcionId: o.opcionId,
            texto: o.texto,
            letra: String.fromCharCode(65 + index),
            esCorrecta: o.esCorrecta,
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

  private toResponse(
    sala: SalaWithRelations,
    estadoActual: string,
    onlineSet: Set<string>,
    historialPreguntas: any[],
  ) {
    return {
      salaId: sala.salaId,
      adminId: sala.adminId,
      bancoId: sala.bancoId,
      nombre: sala.nombre,
      estado: estadoActual,
      maxEstudiantes: sala.maxEstudiantes,
      limitePreguntas: sala.limitePreguntas,
      tiempoLimitePregunta: sala.tiempoLimitePregunta,
      tokenCompartido: sala.tokenCompartido,
      totalParticipantes: sala.participantes.length,
      createdAt: sala.createdAt,

      participantes: sala.participantes.map((p) => ({
        id: p.nickname,
        nombre: p.nickname,
        participanteId: p.participanteId,
        nickname: p.nickname,
        rol: p.rol,
        isOnline: onlineSet.has(p.nickname),
      })),

      comodines: sala.comodines.map((sc) => ({
        comodinId: sc.comodin.comodinId,
        nombre: sc.comodin.nombre,
        descripcion: sc.comodin.descripcion,
        icono: sc.comodin.icono,
        activo: sc.activo,
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
