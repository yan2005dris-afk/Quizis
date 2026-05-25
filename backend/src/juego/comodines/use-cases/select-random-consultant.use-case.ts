import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

@Injectable()
export class SelectRandomConsultantUseCase {
  private readonly logger = new Logger(SelectRandomConsultantUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(tokenCompartido: string) {
    this.logger.log(
      `Seleccionando consultor aleatorio para sala: ${tokenCompartido}`,
    );

    // 1. Obtener ronda activa y estudiante
    const rondaActiva = await this.prisma.rondas.findFirst({
      where: {
        sala: { tokenCompartido },
        estado: 'jugando',
      },
      include: {
        participante: true,
      },
    });

    if (!rondaActiva) {
      this.logger.warn(
        `No hay ronda activa jugando en la sala con token: ${tokenCompartido}`,
      );
      return null;
    }

    // 2. Obtener candidatos (observadores que no son el estudiante)
    const candidatos = await this.prisma.participantes.findMany({
      where: {
        salaId: rondaActiva.salaId,
        rol: 'observador',
        nickname: {
          not: rondaActiva.participante.nickname,
        },
      },
    });

    // 3. Filtrar por los que están online en Redis
    const onlineNicknames =
      await this.cacheService.getOnlineParticipants(tokenCompartido);
    const candidatosFiltrados = candidatos.filter((c) =>
      onlineNicknames.includes(c.nickname),
    );

    if (candidatosFiltrados.length === 0) return null;

    // 4. Seleccionar uno al azar
    const randomIndex = Math.floor(Math.random() * candidatosFiltrados.length);
    return candidatosFiltrados[randomIndex];
  }
}
