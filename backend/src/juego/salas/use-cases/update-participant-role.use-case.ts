import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class UpdateParticipantRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokenCompartido: string, nickname: string, nuevoRol: string) {
    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
    });

    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (nickname.startsWith('Host-')) {
      throw new BadRequestException(
        'El administrador no puede cambiar su rol de participante.',
      );
    }

    const participante = await this.prisma.$transaction(async (tx) => {
      if (nuevoRol === 'estudiante') {
        await tx.participantes.updateMany({
          where: {
            salaId: sala.salaId,
            deletedAt: null,
            rol: 'estudiante',
            nickname: { not: nickname },
          },
          data: {
            rol: 'observador',
          },
        });
      }

      return tx.participantes.update({
        where: {
          salaId_nickname: {
            salaId: sala.salaId,
            nickname,
          },
        },
        data: {
          rol: nuevoRol,
        },
      });
    });

    return participante;
  }
}
