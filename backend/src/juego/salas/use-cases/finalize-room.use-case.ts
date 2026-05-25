import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';

@Injectable()
export class FinalizeRoomUseCase {
  private readonly logger = new Logger(FinalizeRoomUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly participantsCache: ParticipantsCacheUseCase,
    private readonly roomStateCache: RoomStateCacheUseCase,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Finalizando sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    // 1. Obtener todos los nicknames históricos desde Redis (todos los que alguna vez entraron)
    const historicalNicknames = await this.participantsCache.getHistoricalParticipants(
      sala.tokenCompartido,
    );

    // 2. Persistir en DB — upsert de cada participante real (excluir entradas de host)
    const participantesReales = historicalNicknames.filter(
      (n) => !n.startsWith('Host-'),
    );

    for (const nickname of participantesReales) {
      await this.prisma.participantes.upsert({
        where: { salaId_nickname: { salaId, nickname } },
        create: { salaId, nickname, rol: 'observador' },
        update: {},
      });
    }

    // 3. Actualizar estado en DB
    await this.prisma.salas.update({
      where: { salaId },
      data: {
        estado: EstadoSala.FINALIZADO,
        updatedAt: new Date(),
      },
    });

    // 4. Marcar sala como deshabilitada en cache
    await this.roomStateCache.setRoomEnabled(sala.tokenCompartido, false);

    this.logger.log(
      `Sala ${salaId} finalizada. ${participantesReales.length} participantes persistidos.`,
    );

    return {
      success: true,
      totalParticipantes: participantesReales.length,
      message: 'Sala finalizada y datos persistidos.',
    };
  }
}
