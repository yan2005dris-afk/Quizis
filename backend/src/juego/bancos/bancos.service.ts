import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';
import { CreateBancoDto } from './dto/create-banco.dto';

@Injectable()
export class BancosService {
  private readonly logger = new Logger(BancosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBancoDto) {
    this.logger.log(`Creando nuevo banco: ${dto.nombre}`);

    // Si hay preguntas, validarlas antes de empezar
    if (dto.preguntas && dto.preguntas.length > 0) {
      this.validatePreguntas(dto.preguntas);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el banco
      const banco = await tx.bancoPreguntas.create({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion ?? null,
        },
      });

      // 2. Si hay preguntas, crearlas asociadas al banco
      if (dto.preguntas && dto.preguntas.length > 0) {
        await Promise.all(
          dto.preguntas.map((pregunta) =>
            tx.preguntas.create({
              data: {
                bancoId: banco.bancoId,
                texto: pregunta.texto,
                categoria: pregunta.categoria,
                nivel: pregunta.nivel ?? 1,
                monto: pregunta.monto,
                feedbackCorrecto: pregunta.feedbackCorrecto,
                feedbackIncorrecto: pregunta.feedbackIncorrecto,
                opciones: {
                  create: pregunta.opciones.map((op) => ({
                    texto: op.texto,
                    esCorrecta: op.esCorrecta ?? false,
                  })),
                },
              },
            }),
          ),
        );
        this.logger.log(
          `Creadas ${dto.preguntas.length} preguntas iniciales para el banco ${banco.bancoId}`,
        );
      }

      return banco;
    });
  }

  async crearPreguntas(bancoId: number, preguntas: any[]) {
    this.logger.log(`Creando ${preguntas.length} preguntas en banco ${bancoId}`);
    this.validatePreguntas(preguntas);

    const creadas = await this.prisma.$transaction(
      preguntas.map((pregunta) =>
        this.prisma.preguntas.create({
          data: {
            bancoId,
            texto: pregunta.texto,
            categoria: pregunta.categoria,
            nivel: pregunta.nivel ?? 1,
            monto: pregunta.monto,
            feedbackCorrecto: pregunta.feedbackCorrecto,
            feedbackIncorrecto: pregunta.feedbackIncorrecto,
            opciones: {
              create: pregunta.opciones.map((op) => ({
                texto: op.texto,
                esCorrecta: op.esCorrecta ?? false,
              })),
            },
          },
        }),
      ),
    );

    this.logger.log(`Creadas ${creadas.length} preguntas en banco ${bancoId}`);
    return creadas.length;
  }

  private validatePreguntas(preguntas: any[]) {
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      const correctas = pregunta.opciones.filter((op) => op.esCorrecta).length;
      if (correctas !== 1) {
        throw new BadRequestException(
          `La pregunta ${i + 1} debe tener exactamente 1 opción correcta, pero tiene ${correctas}.`,
        );
      }
    }
  }

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
      throw new NotFoundException(
        `Banco de preguntas con ID ${id} no encontrado`,
      );
    }

    return banco;
  }

  async update(id: number, dto: { nombre?: string; descripcion?: string }) {
    this.logger.log(`Actualizando banco ${id}`);
    const banco = await this.prisma.bancoPreguntas.findUnique({
      where: { bancoId: id },
    });

    if (!banco) {
      throw new NotFoundException(
        `Banco de preguntas con ID ${id} no encontrado`,
      );
    }

    return this.prisma.bancoPreguntas.update({
      where: { bancoId: id },
      data: {
        nombre: dto.nombre ?? banco.nombre,
        descripcion:
          dto.descripcion !== undefined ? dto.descripcion : banco.descripcion,
      },
    });
  }

  async updatePregunta(
    bancoId: number,
    preguntaId: number,
    dto: UpdatePreguntaDto,
  ) {
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
