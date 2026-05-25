import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

@Injectable()
export class FinalizeRoomUseCase {
  private readonly logger = new Logger(FinalizeRoomUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(salaId: number) {
    this.logger.log(`Finalizando sala ID: ${salaId}`);

    const sala = await this.prisma.salas.findUnique({
      where: { salaId },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${salaId} no encontrada`);
    }

    // 1. Obtener conteo de participantes únicos desde Redis
    const totalParticipantes = await this.cacheService.getSessionParticipantCount(sala.tokenCompartido);

    // 2. Actualizar estado y estadística en DB
    await this.prisma.salas.update({
      where: { salaId },
      data: {
        estado: EstadoSala.FINALIZADO,
        totalParticipantes: totalParticipantes,
        updatedAt: new Date(),
      },
    });

    // 3. Limpiar caché de Redis (opcional o con delay, aquí lo hacemos inmediato para el estado)
    await this.cacheService.setRoomEnabled(sala.tokenCompartido, false);

    this.logger.log(`Sala ${salaId} finalizada con ${totalParticipantes} participantes.`);

    return {
      success: true,
      totalParticipantes,
      message: 'Sala finalizada y datos persistidos.',
    };
  }
}
