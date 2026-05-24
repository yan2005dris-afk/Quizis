import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class InitRondaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(salaId: number, participanteId: number) {
    // 1. Validar Sala
    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (sala.estado === 'finalizado') {
      throw new BadRequestException('La sala ya está finalizada');
    }

    // 2. Validar Participante
    const participante = await this.prisma.participantes.findUnique({
      where: { participanteId },
    });

    if (!participante || participante.salaId !== salaId) {
      throw new NotFoundException(
        'Participante no encontrado o no pertenece a esta sala',
      );
    }

    // 3. Algoritmo de selección aleatoria (ORDER BY RANDOM())
    // Extraer límite y banco
    const limite = sala.limitePreguntas;
    const bancoId = sala.bancoId;

    // Ejecutamos Raw SQL para mayor rendimiento y verdadera aletoriedad nativa de Postgres
    const preguntasRandom = await this.prisma.$queryRaw<
      Array<{ pregunta_id: number }>
    >`
      SELECT pregunta_id
      FROM preguntas
      WHERE banco_id = ${bancoId}
      ORDER BY RANDOM()
      LIMIT ${limite};
    `;

    if (!preguntasRandom || preguntasRandom.length === 0) {
      throw new BadRequestException(
        'No se encontraron preguntas en el banco asignado a esta sala',
      );
    }

    const preguntasAsignadas = preguntasRandom.map((p) => p.pregunta_id);

    // 4. Determinar número de ronda (Intento 1, 2, etc.)
    const rondasPrevias = await this.prisma.rondas.count({
      where: { salaId },
    });
    const numeroRonda = rondasPrevias + 1;

    // 5. Crear la ronda
    const nuevaRonda = await this.prisma.rondas.create({
      data: {
        salaId,
        participanteId,
        numeroRonda,
        estado: 'pendiente', // Listo para que el admin lo arranque en vivo
        preguntasAsignadas: preguntasAsignadas as any, // Cast a any para JSON
      },
    });

    return {
      ronda: nuevaRonda,
      totalPreguntasSeleccionadas: preguntasAsignadas.length,
    };
  }
}
