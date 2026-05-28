import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class UpdateParticipantRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tokenCompartido: string,
    nickname: string,
    nuevoRol: string,
    onlineNicknames?: string[],
  ) {
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

    // Only check cap when promoting to 'estudiante'
    if (nuevoRol === 'estudiante') {
      // Contar solo estudiantes ONLINE (los desconectados no ocupan cupo)
      const whereEstudiantes: any = {
        salaId: sala.salaId,
        deletedAt: null,
        rol: 'estudiante',
        nickname: { not: nickname },
      };

      if (onlineNicknames) {
        whereEstudiantes.nickname = { in: onlineNicknames, not: nickname };
      }

      const currentEstudiantes = await this.prisma.participantes.count({
        where: whereEstudiantes,
      });

      if (currentEstudiantes >= sala.maxEstudiantes) {
        throw new BadRequestException(
          'Límite de estudiantes alcanzado. Degradá a otro participante online primero.',
        );
      }
    }

    const participante = await this.prisma.$transaction(async (tx) => {
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
