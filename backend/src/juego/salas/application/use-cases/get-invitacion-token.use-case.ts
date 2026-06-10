import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

@Injectable()
export class GetInvitacionTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(salaId: number) {
    const sala = await this.prisma.salas.findUnique({ where: { salaId } });
    if (!sala) throw new NotFoundException(`Sala ${salaId} no encontrada`);

    const roomSecret = this.config.getOrThrow<string>('JWT_ROOM_SECRET');
    const tokenInvitacion = await this.jwtService.signAsync(
      { sub: sala.tokenCompartido, salaId: sala.salaId, tipo: 'room_invite' },
      { secret: roomSecret, expiresIn: '24h' },
    );

    return { tokenInvitacion };
  }
}
