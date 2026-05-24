import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateRondaDto } from '../dto/create-ronda.dto';

/**
 * Caso de uso: Crear una nueva ronda de juego para un participante.
 *
 * Responsabilidades:
 * - Verificar que la sala referenciada exista.
 * - Ejecutar el algoritmo de selección aleatoria delegando a PostgreSQL
 *   mediante `ORDER BY RANDOM()` para obtener exactamente la cantidad
 *   de preguntas definida en el `limitePreguntas` de la sala.
 * - Almacenar los IDs de las preguntas seleccionadas en el campo JSON
 *   `preguntasAsignadas` de la tabla Rondas, garantizando que cada ronda
 *   tenga su propio conjunto exclusivo de preguntas.
 */
@Injectable()
export class CreateRondaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la creación de una ronda con preguntas aleatorias.
   * @param createRondaDto - Datos validados (salaId, participanteId, numeroRonda).
   * @returns La ronda creada con el campo `preguntasAsignadas` poblado.
   * @throws NotFoundException si la sala no existe.
   * @throws BadRequestException si el banco de preguntas de la sala está vacío.
   */
  async execute(createRondaDto: CreateRondaDto) {
    const { salaId, participanteId, numeroRonda } = createRondaDto;

    // Verificar que la sala exista y obtener su configuración (bancoId, limitePreguntas)
    const sala = await this.prisma.salas.findUnique({ where: { salaId } });
    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    // Selección aleatoria de preguntas delegada a PostgreSQL.
    // ORDER BY RANDOM() es altamente eficiente para conjuntos moderados (<10k filas)
    // y garantiza distribución uniforme sin sesgo algorítmico.
    const limite = sala.limitePreguntas || 15;

    const randomQuestions = await this.prisma.$queryRaw<
      { pregunta_id: number }[]
    >`
      SELECT pregunta_id 
      FROM preguntas 
      WHERE banco_id = ${sala.bancoId} AND borrado_en IS NULL
      ORDER BY RANDOM() 
      LIMIT ${limite}
    `;

    // Validar que existan preguntas disponibles en el banco
    if (randomQuestions.length === 0) {
      throw new BadRequestException(
        'El banco de preguntas de esta sala está vacío',
      );
    }

    // Extraer solo los IDs para almacenarlos como JSON compacto
    const preguntasAsignadas = randomQuestions.map((q) => q.pregunta_id);

    // Crear la ronda con las preguntas aleatorias asignadas exclusivamente a este intento
    const ronda = await this.prisma.rondas.create({
      data: {
        salaId,
        participanteId,
        numeroRonda,
        estado: 'pendiente',
        preguntasAsignadas, // Almacenado como JSON en PostgreSQL (ej. [12, 45, 8, 3])
      },
    });

    return ronda;
  }
}
