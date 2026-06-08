import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { UpdateConfiguracionSalaDto } from '../dto/update-configuracion-sala.dto';
import { EstadoSala } from '../dto/update-estado-sala.dto';

/**
 * Caso de uso: Actualizar la configuración de una sala de juego.
 *
 * Permite cambiar el nombre, el límite de preguntas a seleccionar,
 * y habilitar/deshabilitar comodines específicos para la sala.
 * Solo se permite modificar la configuración en estados BORRADOR o ESPERANDO_ALUMNOS.
 */
@Injectable()
export class UpdateConfiguracionSalaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la actualización de la configuración de la sala.
   * @param id - ID de la sala.
   * @param updateConfigDto - DTO con los campos a actualizar.
   * @throws NotFoundException si la sala no existe o está borrada.
   * @throws BadRequestException si la sala no está en un estado editable o el límite de preguntas excede el banco.
   */
  async execute(id: number, updateConfigDto: UpdateConfiguracionSalaDto) {
    // 1. Obtener la sala y verificar existencia
    const sala = await this.prisma.salas.findUnique({
      where: { salaId: id },
    });

    if (!sala || sala.deletedAt) {
      throw new NotFoundException('Sala no encontrada');
    }

    // 2. Validar que el estado permita modificaciones de configuración
    if (
      sala.estado !== EstadoSala.BORRADOR &&
      sala.estado !== EstadoSala.ESPERANDO_ALUMNOS
    ) {
      throw new BadRequestException(
        `No se puede modificar la configuración de la sala en su estado actual: "${sala.estado}"`,
      );
    }

    // 3. Validar límite de preguntas contra cantidad disponible en el banco
    if (updateConfigDto.limitePreguntas !== undefined) {
      const preguntasBancoCount = await this.prisma.preguntas.count({
        where: { bancoId: sala.bancoId, deletedAt: null },
      });

      if (preguntasBancoCount < updateConfigDto.limitePreguntas) {
        throw new BadRequestException(
          `El banco de preguntas asociado solo tiene ${preguntasBancoCount} preguntas disponibles, ` +
            `pero se solicitaron ${updateConfigDto.limitePreguntas}.`,
        );
      }
    }

    // 4. Validar maxEstudiantes contra cantidad actual de estudiantes (si se proporciona)
    if (updateConfigDto.maxEstudiantes !== undefined) {
      const currentEstudiantes = await this.prisma.participantes.count({
        where: {
          salaId: id,
          deletedAt: null,
          rol: 'estudiante',
        },
      });

      if (updateConfigDto.maxEstudiantes < currentEstudiantes) {
        throw new BadRequestException(
          `No se puede reducir el límite a ${updateConfigDto.maxEstudiantes}. ` +
            `Actualmente hay ${currentEstudiantes} estudiantes en la sala.`,
        );
      }
    }

    // 5. Actualizar datos principales de la sala (solo incluir propiedades definidas)
    const data: Record<string, unknown> = {};
    if (updateConfigDto.nombre !== undefined) {
      data.nombre = updateConfigDto.nombre;
    }
    if (updateConfigDto.limitePreguntas !== undefined) {
      data.limitePreguntas = updateConfigDto.limitePreguntas;
    }
    if (updateConfigDto.maxEstudiantes !== undefined) {
      data.maxEstudiantes = updateConfigDto.maxEstudiantes;
    }
    if (updateConfigDto.tiempoLimitePregunta !== undefined) {
      data.tiempoLimitePregunta = updateConfigDto.tiempoLimitePregunta;
    }
    await this.prisma.salas.update({
      where: { salaId: id },
      data,
    });

    // 6. Actualizar la relación de comodines (si se proporciona)
    if (updateConfigDto.comodines && updateConfigDto.comodines.length > 0) {
      for (const item of updateConfigDto.comodines) {
        await this.prisma.salaComodines.upsert({
          where: {
            salaId_comodinId: {
              salaId: id,
              comodinId: item.comodinId,
            },
          },
          update: { activo: item.activo },
          create: {
            salaId: id,
            comodinId: item.comodinId,
            activo: item.activo,
          },
        });
      }
    }

    // 7. Retornar los detalles actualizados
    const salaActualizada = await this.prisma.salas.findUnique({
      where: { salaId: id },
      include: {
        comodines: {
          include: {
            comodin: true,
          },
        },
      },
    });

    if (!salaActualizada) {
      throw new NotFoundException('Error al recuperar la sala actualizada');
    }

    return {
      salaId: salaActualizada.salaId,
      adminId: salaActualizada.adminId,
      bancoId: salaActualizada.bancoId,
      nombre: salaActualizada.nombre,
      tokenCompartido: salaActualizada.tokenCompartido,
      estado: salaActualizada.estado,
      limitePreguntas: salaActualizada.limitePreguntas,
      createdAt: salaActualizada.createdAt,
      comodines: salaActualizada.comodines.map((sc) => ({
        comodinId: sc.comodin.comodinId,
        nombre: sc.comodin.nombre,
        descripcion: sc.comodin.descripcion,
        activo: sc.activo,
      })),
    };
  }
}
