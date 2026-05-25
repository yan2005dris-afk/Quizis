import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class BancosService {
  private readonly logger = new Logger(BancosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.logger.log('Buscando todos los bancos de preguntas');
    return this.prisma.bancoPreguntas.findMany({
      include: {
        _count: {
          select: { preguntas: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findOne(id: number) {
    this.logger.log(`Buscando banco de preguntas con ID: ${id}`);
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: id },
      include: {
        preguntas: {
          include: {
            opciones: true
          }
        }
      }
    });

    if (!banco) {
      throw new NotFoundException(`Banco de preguntas con ID ${id} no encontrado`);
    }

    return banco;
  }
}
