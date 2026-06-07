import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ReportDataDto } from './dtos/report-data.dto';

interface RespuestaRaw {
  esCorrecta: boolean;
  comodinUsado?: string;
  pregunta: { preguntaId: number; texto: string };
  opcion?: { texto: string; esCorrecta: boolean };
}

interface VotoRaw {
  preguntaId: number;
  opcion: { esCorrecta: boolean };
}

interface RondaRaw {
  numeroRonda: number;
  participante: { nickname: string };
  respuestas: RespuestaRaw[];
  votos: VotoRaw[];
}

interface SalaRaw {
  salaId: number;
  nombre: string;
  admin: { email: string };
  createdAt: Date;
  estado: string;
  rondas: RondaRaw[];
}

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerEstadisticas(salaId: number): Promise<ReportDataDto> {
    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
      include: {
        admin: { select: { email: true } },
        rondas: {
          include: {
            participante: { select: { nickname: true } },
            respuestas: {
              include: {
                pregunta: { select: { preguntaId: true, texto: true } },
                opcion: { select: { texto: true, esCorrecta: true } },
              },
            },
            votos: {
              include: {
                opcion: { select: { esCorrecta: true } },
              },
            },
          },
          orderBy: { numeroRonda: 'asc' },
        },
      },
    });

    if (!sala) {
      throw new BadRequestException(`Sala ${salaId} no existe`);
    }

    if (sala.estado !== 'FINALIZADO') {
      throw new BadRequestException(
        'Solo se pueden generar reportes de salas finalizadas.',
      );
    }

    if (sala.rondas.length === 0) {
      throw new BadRequestException('La sala no tiene rondas completadas');
    }

    return this.construirReporte(sala as unknown as SalaRaw);
  }

  private construirReporte(sala: SalaRaw): ReportDataDto {
    let totalCorrectasGlobal = 0;
    let totalIncorrectasGlobal = 0;
    const participantesUnicos = new Set<string>();

    const rondas = sala.rondas.map((ronda) => {
      participantesUnicos.add(ronda.participante.nickname);
      const {
        correctas,
        incorrectas,
        ronda: rondaData,
      } = this.procesarRonda(ronda);

      totalCorrectasGlobal += correctas;
      totalIncorrectasGlobal += incorrectas;

      return rondaData;
    });

    const totalPreguntasGlobal = totalCorrectasGlobal + totalIncorrectasGlobal;
    const porcentajeGlobal =
      totalPreguntasGlobal > 0
        ? (totalCorrectasGlobal / totalPreguntasGlobal) * 100
        : 0;

    return {
      salaId: sala.salaId,
      nombreSala: sala.nombre,
      docente: sala.admin.email,
      fechaCreacion: sala.createdAt,
      rondas,
      resumenGeneral: {
        totalRondas: sala.rondas.length,
        participantes: Array.from(participantesUnicos),
        totalPreguntasRespondidas: totalPreguntasGlobal,
        totalCorrectas: totalCorrectasGlobal,
        totalIncorrectas: totalIncorrectasGlobal,
        porcentajeGlobal: Number(porcentajeGlobal.toFixed(2)),
      },
    };
  }

  private procesarRonda(ronda: RondaRaw) {
    let correctas = 0;
    let incorrectas = 0;
    const comodines = new Set<string>();

    const preguntas = ronda.respuestas.map(
      (respuesta: RespuestaRaw, index: number) => {
        if (respuesta.esCorrecta) {
          correctas++;
        } else {
          incorrectas++;
        }

        if (respuesta.comodinUsado) {
          comodines.add(respuesta.comodinUsado);
        }

        return {
          numero: index + 1,
          texto: respuesta.pregunta.texto,
          respuestaElegida: respuesta.opcion?.texto || 'No respondida',
          esCorrecta: respuesta.esCorrecta,
          comodinUsado: respuesta.comodinUsado,
          porcentajeVotosPublico: this.calcularVotosPublico(
            respuesta,
            ronda.votos,
          ),
        };
      },
    );

    const total = correctas + incorrectas;
    const porcentaje = total > 0 ? (correctas / total) * 100 : 0;

    return {
      correctas,
      incorrectas,
      ronda: {
        numeroRonda: ronda.numeroRonda,
        participanteNickname: ronda.participante.nickname,
        totalPreguntas: total,
        correctas,
        incorrectas,
        porcentajeAcierto: Number(porcentaje.toFixed(2)),
        comodinesUsados: Array.from(comodines),
        preguntas,
      },
    };
  }

  private calcularVotosPublico(
    respuesta: RespuestaRaw,
    votos: VotoRaw[],
  ): number | undefined {
    if (respuesta.comodinUsado !== 'publico') return undefined;

    const votosPregunta = votos.filter(
      (v) => v.preguntaId === respuesta.pregunta.preguntaId,
    );

    if (votosPregunta.length === 0) return undefined;

    const votosCorrectos = votosPregunta.filter(
      (v) => v.opcion.esCorrecta,
    ).length;

    return Number(((votosCorrectos / votosPregunta.length) * 100).toFixed(1));
  }
}
