import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';
import { RegenerateRoomTokenUseCase } from './regenerate-room-token.use-case';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReactivateRoomUseCase {
  private readonly logger = new Logger(ReactivateRoomUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Reactivando sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    // Solo permitir reactivar si está FINALIZADO
    if (sala.estado !== EstadoSala.FINALIZADO) {
      throw new BadRequestException(
        `Solo se pueden reactivar salas finalizadas. Estado actual: "${sala.estado}"`,
      );
    }

    const nuevoTokenUUID = uuidv4();

    // Actualizar DB: nuevo token + estado BORRADOR
    await this.prisma.salas.update({
      where: { salaId },
      data: {
        tokenCompartido: nuevoTokenUUID,
        estado: EstadoSala.BORRADOR,
      },
    });

    // Actualizar Redis
    await this.roomStateCache.setRoomEstado(
      sala.tokenCompartido,
      EstadoSala.BORRADOR,
    );

    // Generar nuevo JWT de invitación
    const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
    const roomExpiresIn = this.config.get<string>(
      'JWT_ROOM_EXPIRES_IN',
      '24h',
    );
    const tokenInvitacion = await this.jwtService.signAsync(
      {
        sub: nuevoTokenUUID,
        salaId,
        tipo: 'room_invite',
      },
      {
        secret: roomSecret,
        expiresIn: roomExpiresIn as any,
      },
    );

    this.logger.log(`Sala ${salaId} reactivada exitosamente`);

    return {
      success: true,
      estado: EstadoSala.BORRADOR,
      tokenCompartido: nuevoTokenUUID,
      tokenInvitacion,
      message: 'Sala reactivada. Se ha generado un nuevo link de invitación.',
    };
  }
}
