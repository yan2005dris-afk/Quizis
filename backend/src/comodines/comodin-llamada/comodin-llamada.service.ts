import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class ComodinLlamadaService {
  constructor(private readonly prismaService: PrismaService) {}
  /**
   * Busca entre los clientes a ver quien tiene el rol de "estudiante", es decir el que esta jugando en ese momento
   * @param tokenCompartido
   * @returns
   */
  public async getRondaActivaConEstudiante(tokenCompartido: string) {
    return this.prismaService.extendedClient.rondas.findFirst({
      where: {
        sala: { tokenCompartido },
        estado: 'jugando',
      },
      include: {
        participante: true,
      },
    });
  }
  /**
   * Busca entre los clientes a ver quienes pueden ser consultores, es decir, quienes tengan el rol de "observador", no son el estudiante y estan en linea
   * @param salaId
   * @param estudianteNickname
   * @returns
   */
  private async getConsultoresCandidatos(
    salaId: number,
    estudianteNickname: string,
  ) {
    return this.prismaService.extendedClient.participantes.findMany({
      where: {
        salaId,
        isOnline: true,
        rol: 'observador',
        nickname: {
          not: estudianteNickname,
        },
      },
    });
  }

  /**
   * Devuelve un elemento aleatorio del array
   * @param array Array del cual se seleccionara un elemento
   * @returns Elemento aleatorio del array o null si el array esta vacio
   */
  private selectRandomElement<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }

  /**
   * Selecciona un consultor aleatorio entre los clientes conectados
   * @param tokenCompartido Token de la sala
   * @returns Consultor seleccionado o null si no se encontro ninguno
   */
  public async seleccionarConsultorAleatorio(tokenCompartido: string) {
    const rondaActiva = await this.getRondaActivaConEstudiante(tokenCompartido);
    if (!rondaActiva) {
      console.warn(
        `No hay ronda activa jugando en la sala con token: ${tokenCompartido}`,
      );
      return null;
    }

    const candidatos = await this.getConsultoresCandidatos(
      rondaActiva.salaId,
      rondaActiva.participante.nickname,
    );

    return this.selectRandomElement(candidatos);
  }
}
