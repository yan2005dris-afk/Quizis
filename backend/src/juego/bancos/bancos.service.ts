import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Injectable()
export class BancosService {
  private readonly logger = new Logger(BancosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.logger.log('Buscando todos los bancos de preguntas');
    return this.prisma.bancoPreguntas.findMany({
      include: {
        _count: {
          select: { preguntas: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    this.logger.log(`Buscando banco de preguntas con ID: ${id}`);
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: id },
      include: {
        preguntas: {
          include: {
            opciones: true,
          },
          orderBy: {
            preguntaId: 'asc',
          },
        },
      },
    });

    if (!banco) {
      throw new NotFoundException(`Banco de preguntas con ID ${id} no encontrado`);
    }

    return banco;
  }

  async updatePregunta(bancoId: number, preguntaId: number, dto: UpdatePreguntaDto) {
    this.logger.log(`Actualizando pregunta ${preguntaId} del banco ${bancoId}`);

    // Verificar que la pregunta pertenece al banco
    const preguntaExistente = await this.prisma.preguntas.findFirst({
      where: { preguntaId, bancoId },
    });

    if (!preguntaExistente) {
      throw new NotFoundException(
        `Pregunta ${preguntaId} no encontrada en el banco ${bancoId}`,
      );
    }

    // Extraemos solo los campos que Prisma puede actualizar
    const { 
      opciones, 
      preguntaId: _pId, 
      bancoId: _bId, 
      createdAt: _cAt, 
      updatedAt: _uAt, 
      deletedAt: _dAt, 
      ...datosPregunta 
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar datos básicos de la pregunta
      await tx.preguntas.update({
        where: { preguntaId },
        data: {
          ...datosPregunta,
          updatedAt: new Date(),
        },
      });

      // 2. Si vienen opciones, sincronizarlas
      if (opciones) {
        await tx.opcionesPregunta.deleteMany({
          where: { preguntaId },
        });

        await tx.opcionesPregunta.createMany({
          data: opciones.map((o) => ({
            preguntaId,
            texto: o.texto,
            esCorrecta: o.esCorrecta,
          })),
        });
      }

      return this.findOne(bancoId);
    });
  }
}
