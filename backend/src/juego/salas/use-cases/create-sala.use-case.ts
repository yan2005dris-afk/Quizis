import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateSalaDto } from '../dto/create-sala.dto';
import { EstadoSala } from '../dto/update-estado-sala.dto';

/**
 * Caso de uso: Crear una nueva sala de juego.
 *
 * Responsabilidades:
 * - Verificar que el banco de preguntas exista.
 * - Generar un código PIN único con formato UPSE-XXX.
 * - Manejar colisiones de PIN de forma atómica capturando el error P2002
 *   de Prisma (violación de constraint UNIQUE) y reintentando hasta MAX_RETRIES.
 */
@Injectable()
export class CreateSalaUseCase {
  /** Número máximo de reintentos para generar un PIN único */
  private readonly MAX_RETRIES = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la creación de una sala de juego.
   * @param createSalaDto - Datos validados para crear la sala (bancoId, nombre, limitePreguntas).
   * @param adminId - ID del usuario administrador autenticado que crea la sala.
   * @returns La sala recién creada con su código PIN generado.
   * @throws NotFoundException si el banco de preguntas no existe.
   * @throws Error si no se logra generar un PIN único después de MAX_RETRIES intentos.
   */
  async execute(createSalaDto: CreateSalaDto, adminId: number) {
    const { bancoId, nombre, limitePreguntas } = createSalaDto;

    // Verificar que el banco de preguntas referenciado exista en la base de datos
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId },
    });
    if (!banco) {
      throw new NotFoundException('El banco de preguntas no existe');
    }

    // Generar PIN único con manejo de concurrencia atómico.
    // En lugar de consultar si existe y luego insertar (race condition),
    // intentamos insertar directamente y capturamos el error P2002
    // si el PIN ya fue tomado por otra petición concurrente.
    let intentos = 0;

    while (intentos < this.MAX_RETRIES) {
      try {
        const randomDigits = Math.floor(100 + Math.random() * 900); // Rango: 100–999
        const codigoPin = `UPSE-${randomDigits}`;

        const sala = await this.prisma.salas.create({
          data: {
            adminId,
            bancoId,
            nombre,
            codigoPin,
            limitePreguntas: limitePreguntas || 15,
            estado: EstadoSala.BORRADOR,
          },
        });

        return sala;
      } catch (error: any) {
        // P2002 = Violación de constraint UNIQUE en Prisma
        if (
          error.code === 'P2002' &&
          (error.meta?.target?.includes('codigo_pin') ||
            error.meta?.target?.includes('token_compartido'))
        ) {
          intentos++;
          continue; // Reintentar con un nuevo PIN
        }
        throw error; // Re-lanzar cualquier otro error no esperado
      }
    }

    throw new Error(
      'No se pudo generar un PIN único para la sala después de varios intentos',
    );
  }
}
