import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegenerateRoomTokenUseCase {
  private readonly logger = new Logger(RegenerateRoomTokenUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Regenerando token para sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    const nuevoTokenUUID = uuidv4();

    const actualizada = await this.prisma.salas.update({
      where: { salaId },
      data: { tokenCompartido: nuevoTokenUUID },
    });

    // Generar nuevo JWT
    const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
    const tokenInvitacion = await this.jwtService.signAsync(
      {
        sub: nuevoTokenUUID,
        salaId: actualizada.salaId,
        tipo: 'room_invite',
      },
      {
        secret: roomSecret,
        expiresIn: '24h',
      },
    );

    return {
      success: true,
      tokenCompartido: actualizada.tokenCompartido,
      tokenInvitacion,
      message: 'Token regenerado exitosamente.',
    };
  }
}
