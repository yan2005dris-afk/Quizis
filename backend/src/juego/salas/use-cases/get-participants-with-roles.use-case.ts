import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class GetParticipantsWithRolesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokenCompartido: string, nicknames: string[]) {
    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
    });

    if (!sala) {
      return nicknames.map((n) => ({
        id: n,
        nombre: n,
        puntaje: 0,
        rol: n.startsWith('Host-') ? 'admin' : 'observador',
      }));
    }

    const participantesDb = await this.prisma.participantes.findMany({
      where: {
        salaId: sala.salaId,
        nickname: { in: nicknames },
      },
    });

    return nicknames.map((nickname) => {
      const dbParticipant = participantesDb.find(
        (p) => p.nickname === nickname,
      );
      return {
        id: nickname,
        nombre: nickname,
        puntaje: 0,
        rol: nickname.startsWith('Host-')
          ? 'admin'
          : dbParticipant
            ? dbParticipant.rol
            : 'observador',
      };
    });
  }
}
