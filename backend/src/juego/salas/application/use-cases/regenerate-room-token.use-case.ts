import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GameEvents } from '../../../../core/common/events/game-events.types';

@Injectable()
export class RegenerateRoomTokenUseCase {
  private readonly logger = new Logger(RegenerateRoomTokenUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Regenerando token para sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    const tokenCompartidoViejo = sala.tokenCompartido;
    const nuevoTokenUUID = randomUUID();

    const actualizada = await this.prisma.salas.update({
      where: { salaId },
      data: { tokenCompartido: nuevoTokenUUID },
    });

    // Generar nuevo JWT
    const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
    const roomExpiresIn = this.config.get<string>('JWT_ROOM_EXPIRES_IN', '24h');
    const tokenInvitacion = await this.jwtService.signAsync(
      {
        sub: nuevoTokenUUID,
        salaId: actualizada.salaId,
        tipo: 'room_invite',
      },
      {
        secret: roomSecret,
        expiresIn: roomExpiresIn as any,
      },
    );

    // Broadcast token regeneration to the OLD room. Per design
    // decision ("only notify, don't kick"), connected sockets stay
    // joined — they already have a valid session. New participants
    // joining the shareable link will land in a fresh socket.io room
    // (keyed by the new tokenCompartido). The frontend updates the
    // displayed invite link live; nobody is forced to disconnect.
    this.eventEmitter.emit(GameEvents.SALA.TOKEN_REGENERADO, {
      tokenCompartidoViejo,
      tokenCompartidoNuevo: actualizada.tokenCompartido,
      tokenInvitacion,
    });

    return {
      success: true,
      tokenCompartido: actualizada.tokenCompartido,
      tokenInvitacion,
      message: 'Token regenerado exitosamente.',
    };
  }
}
