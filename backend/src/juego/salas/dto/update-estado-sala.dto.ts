import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum que define los estados posibles del ciclo de vida de una sala.
 * Flujo válido: BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO
 */
export enum EstadoSala {
  BORRADOR = 'BORRADOR',
  ESPERANDO_ALUMNOS = 'ESPERANDO_ALUMNOS',
  EN_VIVO = 'EN_VIVO',
  FINALIZADO = 'FINALIZADO',
}

/**
 * DTO para actualizar el estado de una sala de juego.
 * La transición de estados es validada en el caso de uso correspondiente.
 */
export class UpdateEstadoSalaDto {
  /** Nuevo estado al que se desea transicionar la sala */
  @ApiProperty({ enum: EstadoSala, example: EstadoSala.ESPERANDO_ALUMNOS })
  @IsEnum(EstadoSala, {
    message:
      'El estado debe ser BORRADOR, ESPERANDO_ALUMNOS, EN_VIVO o FINALIZADO',
  })
  @IsNotEmpty()
  estado: EstadoSala;
}
