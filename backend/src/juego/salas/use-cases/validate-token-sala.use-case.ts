import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

/**
 * Payload esperado dentro del JWT de invitación a sala.
 */
interface RoomTokenPayload {
  sub: string; // tokenCompartido (UUID)
  salaId: number;
  tipo: string; // 'room_invite'
  iat: number;
  exp: number;
}

/**
 * Caso de uso: Validar un token JWT de invitación a sala.
 *
 * Responsabilidades:
 * - Verificar la firma criptográfica y la expiración del JWT.
 * - Buscar la sala en la base de datos por `tokenCompartido`.
 * - Validar que la sala no esté soft-deleted ni en estado FINALIZADO.
 *
 * Este endpoint es público (no requiere JWT de admin).
 * Lo usa el Grupo 7 (audiencia móvil) para validar el link de invitación.
 */
@Injectable()
export class ValidateTokenSalaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Valida un token JWT de invitación y retorna los datos de la sala.
   * @param token - JWT de invitación (viene de la URL del link compartido).
   * @returns Datos públicos de la sala si el token es válido.
   * @throws BadRequestException si el token es inválido, expirado o de tipo incorrecto.
   * @throws NotFoundException si la sala no existe o fue eliminada.
   * @throws BadRequestException si la sala está en estado FINALIZADO.
   */
  async execute(token: string) {
    // 1. Verificar firma + expiración del JWT
    let payload: RoomTokenPayload;
    try {
      const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
      payload = await this.jwtService.verifyAsync<RoomTokenPayload>(token, {
        secret: roomSecret,
      });
    } catch {
      throw new BadRequestException(
        'El token de invitación es inválido o ha expirado',
      );
    }

    // 2. Validar que el JWT sea de tipo room_invite
    if (payload.tipo !== 'room_invite') {
      throw new BadRequestException(
        'El token proporcionado no es un token de invitación a sala',
      );
    }

    // 3. Buscar la sala por tokenCompartido
    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido: payload.sub },
      select: {
        salaId: true,
        nombre: true,
        estado: true,
        tokenCompartido: true,
        limitePreguntas: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!sala || sala.deletedAt) {
      throw new NotFoundException('La sala no existe o fue eliminada');
    }

    // 4. Validar que la sala no esté finalizada
    if (sala.estado === EstadoSala.FINALIZADO) {
      throw new BadRequestException(
        'La sala ha finalizado y ya no acepta participantes',
      );
    }

    return {
      salaId: sala.salaId,
      nombre: sala.nombre,
      estado: sala.estado,
      limitePreguntas: sala.limitePreguntas,
      tokenCompartido: sala.tokenCompartido,
    };
  }
}
