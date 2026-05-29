import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateSalaDto } from '../dto/create-sala.dto';
import { EstadoSala } from '../dto/update-estado-sala.dto';
import { randomUUID } from 'crypto';

/**
 * Caso de uso: Crear una nueva sala de juego.
 *
 * Responsabilidades:
 * - Verificar que el banco de preguntas exista y tenga suficientes preguntas.
 * - Seleccionar al azar la cantidad de preguntas configurada (limitePreguntas).
 * - Generar un token criptográfico UUID para `tokenCompartido`.
 * - Firmar un JWT de invitación con expiración configurable.
 * - Construir el link de invitación con el JWT.
 * - Manejar colisiones de UNIQUE de forma atómica (retry con P2002).
 */
@Injectable()
export class CreateSalaUseCase {
  /** Número máximo de reintentos para generar un token único */
  private readonly MAX_RETRIES = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Ejecuta la creación de una sala de juego.
   * @param createSalaDto - Datos validados para crear la sala.
   * @param adminId - ID del usuario administrador autenticado.
   * @returns La sala creada con token JWT de invitación, link, y preguntas seleccionadas.
   * @throws NotFoundException si el banco de preguntas no existe.
   * @throws BadRequestException si el banco no tiene suficientes preguntas.
   * @throws Error si no se logra generar un token único después de MAX_RETRIES intentos.
   */
  async execute(createSalaDto: CreateSalaDto, adminId: number) {
    const {
      bancoId,
      nombre,
      limitePreguntas,
      duracionTokenHoras,
      maxEstudiantes,
    } = createSalaDto;

    const limite = limitePreguntas || 15;

    // 1. Verificar que el banco de preguntas exista
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId },
    });
    if (!banco) {
      throw new NotFoundException('El banco de preguntas no existe');
    }

    // 2. Obtener todas las preguntas del banco y seleccionar al azar
    const preguntasBanco = await this.prisma.preguntas.findMany({
      where: { bancoId, deletedAt: null },
      select: { preguntaId: true },
    });

    if (preguntasBanco.length < limite) {
      throw new BadRequestException(
        `El banco solo tiene ${preguntasBanco.length} preguntas disponibles, ` +
          `pero se solicitaron ${limite}. Reduzca el límite o agregue más preguntas.`,
      );
    }

    const preguntasSeleccionadas = this.seleccionarAlAzar(
      preguntasBanco.map((p) => p.preguntaId),
      limite,
    );

    // 3. Obtener los comodines del catálogo
    const comodinesCatalogo = await this.prisma.comodines.findMany({
      where: { deletedAt: null },
      select: { comodinId: true },
    });

    // 4. Crear la sala con token criptográfico UUID + PIN interno
    let intentos = 0;

    while (intentos < this.MAX_RETRIES) {
      try {
        const tokenCompartido = randomUUID();

        const sala = await this.prisma.salas.create({
          data: {
            adminId,
            bancoId,
            nombre,
            tokenCompartido,
            limitePreguntas: limite,
            maxEstudiantes: maxEstudiantes ?? 1,
            estado: EstadoSala.BORRADOR,
            comodines: {
              create: comodinesCatalogo.map((c) => ({
                comodinId: c.comodinId,
                activo: true,
              })),
            },
          },
        });

        // 5. Firmar JWT de invitación con expiración
        const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
        const roomExpiresIn = this.config.get<string>(
          'JWT_ROOM_EXPIRES_IN',
          '24h',
        );
        const expiresIn = duracionTokenHoras
          ? `${duracionTokenHoras}h`
          : roomExpiresIn;

        const tokenInvitacion = await this.jwtService.signAsync(
          {
            sub: tokenCompartido,
            salaId: sala.salaId,
            tipo: 'room_invite',
          },
          {
            secret: roomSecret,
            expiresIn: expiresIn as any,
          },
        );

        // Decodificar para obtener fechas de iat/exp
        const decoded = this.jwtService.decode(tokenInvitacion) as {
          iat?: number;
          exp?: number;
        };

        return {
          salaId: sala.salaId,
          nombre: sala.nombre,
          estado: sala.estado,
          tokenCompartido: sala.tokenCompartido,
          tokenInvitacion,
          tokenExpiraEn: decoded?.exp
            ? new Date(decoded.exp * 1000).toISOString()
            : null,
          invitacionUrl: `/room/${tokenInvitacion}`,
          limitePreguntas: limite,
          preguntasSeleccionadas,
          totalPreguntasBanco: preguntasBanco.length,
        };
      } catch (error: any) {
        // P2002 = Violación de constraint UNIQUE en Prisma
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('token_compartido')
        ) {
          intentos++;
          continue; // Reintentar con un nuevo token
        }
        throw error; // Re-lanzar cualquier otro error no esperado
      }
    }

    throw new Error(
      'No se pudo generar un token único para la sala después de varios intentos',
    );
  }

  /**
   * Selecciona `cantidad` elementos al azar de un array usando Fisher-Yates shuffle.
   * @param ids - Array de IDs de preguntas disponibles.
   * @param cantidad - Cantidad de preguntas a seleccionar.
   * @returns Array con los IDs seleccionados al azar.
   */
  private seleccionarAlAzar(ids: number[], cantidad: number): number[] {
    const copia = [...ids];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, cantidad);
  }
}
