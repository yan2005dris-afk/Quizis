import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateSalaDto } from '../dto/create-sala.dto';
import { EstadoSala } from '../dto/update-sala-estado.dto';

@Injectable()
export class CreateSalaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(adminId: number, dto: CreateSalaDto) {
    let pin = '';
    let isUnique = false;
    let attempts = 0;

    // Generar PIN único UPSE-XXXX
    while (!isUnique && attempts < 10) {
      const randomNums = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
      pin = `UPSE-${randomNums}`;

      const existing = await this.prisma.salas.findUnique({
        where: { pin },
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new InternalServerErrorException(
        'No se pudo generar un PIN único para la sala',
      );
    }

    const sala = await this.prisma.salas.create({
      data: {
        adminId,
        bancoId: dto.bancoId,
        nombre: dto.nombre,
        limitePreguntas: dto.limitePreguntas ?? 15,
        estado: EstadoSala.BORRADOR,
        pin,
      },
    });

    return sala;
  }
}
