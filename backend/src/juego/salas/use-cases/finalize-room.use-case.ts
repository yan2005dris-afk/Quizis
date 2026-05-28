import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ChatCacheUseCase } from '../../../infrastructure/cache/use-cases/chat-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';

@Injectable()
export class FinalizeRoomUseCase {
  private readonly logger = new Logger(FinalizeRoomUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly participantsCache: ParticipantsCacheUseCase,
    private readonly roomStateCache: RoomStateCacheUseCase,
    private readonly chatCache: ChatCacheUseCase,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Finalizando sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    // El estado en tiempo real está en Redis — leer de ahí con fallback a DB
    const estadoActual =
      (await this.roomStateCache.getRoomEstado(sala.tokenCompartido)) ?? sala.estado;

    // Solo evitar doble finalización — permitir finalizar desde cualquier estado activo
    if (estadoActual === EstadoSala.FINALIZADO) {
      throw new BadRequestException(
        'La sala ya ha sido finalizada. No se puede finalizar dos veces.',
      );
    }

    // Wrap DB mutations in a transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {

      // 1. Obtener todos los nicknames históricos desde Redis
      const historicalNicknames =
        await this.participantsCache.getHistoricalParticipants(
          sala.tokenCompartido,
        );

      // 2. Persistir en DB — upsert de cada participante real (excluir entradas de host)
      const participantesReales = historicalNicknames.filter(
        (n) => !n.startsWith('Host-'),
      );

      for (const nickname of participantesReales) {
        await tx.participantes.upsert({
          where: { salaId_nickname: { salaId, nickname } },
          create: { salaId, nickname, rol: 'observador' },
          update: {},
        });
      }

      // 3. Actualizar estado en DB
      await tx.salas.update({
        where: { salaId },
        data: {
          estado: EstadoSala.FINALIZADO,
          updatedAt: new Date(),
        },
      });

      return participantesReales;
    });

    // Cache operations (outside transaction — non-critical)
    await this.roomStateCache.setRoomEstado(
      sala.tokenCompartido,
      EstadoSala.FINALIZADO,
    );
    await this.roomStateCache.setRoomEnabled(sala.tokenCompartido, false);
    await this.chatCache.clearMessages(sala.tokenCompartido);

    this.logger.log(
      `Sala ${salaId} finalizada. ${result.length} participantes persistidos.`,
    );

    return {
      success: true,
      totalParticipantes: result.length,
      message: 'Sala finalizada y datos persistidos.',
    };
  }
}
