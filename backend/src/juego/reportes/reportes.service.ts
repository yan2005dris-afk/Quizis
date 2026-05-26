import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ReportDataDto } from './dtos/report-data.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGameStatistics(salaId: number): Promise<ReportDataDto> {
    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
      include: {
        admin: { select: { email: true } },
        rondas: {
          include: {
            participante: { select: { nickname: true } },
            respuestas: {
              include: {
                pregunta: { select: { texto: true } },
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

    if (sala.rondas.length === 0) {
      throw new BadRequestException('La sala no tiene rondas completadas');
    }

    return this.construirReporte(sala);
  }

  private construirReporte(sala: Record<string, any>): ReportDataDto {
    let totalCorrectasGlobal = 0;
    let totalIncorrectasGlobal = 0;
    const participantesUnicos = new Set<string>();

    const rondas = sala.rondas.map((ronda: any) => {
      let rondaCorrectas = 0;
      let rondaIncorrectas = 0;
      const comodinesRonda = new Set<string>();

      participantesUnicos.add(ronda.participante.nickname);

      const preguntas = ronda.respuestas.map(
        (respuesta: any, index: number) => {
          const esCorrecta = respuesta.esCorrecta;

          if (esCorrecta) {
            rondaCorrectas++;
          } else {
            rondaIncorrectas++;
          }

          if (respuesta.comodinUsado) {
            comodinesRonda.add(respuesta.comodinUsado);
          }

          let porcentajeVotosPublico: number | undefined;

          if (respuesta.comodinUsado === 'publico' && ronda.votos.length > 0) {
            const votosCorrectosPublico = ronda.votos.filter(
              (voto: any) => voto.opcion.esCorrecta,
            ).length;
            const calculo = (votosCorrectosPublico / ronda.votos.length) * 100;
            porcentajeVotosPublico = Number(calculo.toFixed(1));
          }

          return {
            numero: index + 1,
            texto: respuesta.pregunta.texto,
            respuestaElegida: respuesta.opcion?.texto || 'No respondida',
            esCorrecta,
            comodinUsado: respuesta.comodinUsado,
            porcentajeVotosPublico,
          };
        },
      );

      totalCorrectasGlobal += rondaCorrectas;
      totalIncorrectasGlobal += rondaIncorrectas;

      const totalPreguntasRonda = rondaCorrectas + rondaIncorrectas;
      const porcentajeRonda =
        totalPreguntasRonda > 0
          ? (rondaCorrectas / totalPreguntasRonda) * 100
          : 0;

      return {
        numeroRonda: ronda.numeroRonda,
        participanteNickname: ronda.participante.nickname,
        totalPreguntas: totalPreguntasRonda,
        correctas: rondaCorrectas,
        incorrectas: rondaIncorrectas,
        porcentajeAcierto: Number(porcentajeRonda.toFixed(2)),
        comodinesUsados: Array.from(comodinesRonda),
        preguntas,
      };
    });

    const totalPreguntasGlobal = totalCorrectasGlobal + totalIncorrectasGlobal;
    const porcentajeGlobal =
      totalPreguntasGlobal > 0
        ? (totalCorrectasGlobal / totalPreguntasGlobal) * 100
        : 0;

    const reportData: ReportDataDto = {
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

    return reportData;
  }
}
