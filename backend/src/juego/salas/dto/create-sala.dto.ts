import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la creación de una nueva sala de juego.
 *
 * Requiere el banco de preguntas asociado y el nombre descriptivo de la sesión.
 * Al crear la sala se genera un token JWT de invitación con expiración
 * configurable y se seleccionan al azar las preguntas del banco.
 */
export class CreateSalaDto {
  /** ID del banco de preguntas del cual se extraerán las preguntas para esta sala */
  @ApiProperty({ example: 1, description: 'ID del banco de preguntas' })
  @IsInt()
  @IsNotEmpty()
  bancoId: number;

  /** Nombre descriptivo de la sala (ej. tema o asignatura) */
  @ApiProperty({
    example:
      'Clase de Calidad de Software - Unidad 1: Introducción a la calidad de software',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  /** Cantidad máxima de preguntas a extraer del banco. Por defecto 15 */
  @ApiPropertyOptional({
    example: 20,
    default: 15,
    description: 'Límite de preguntas a seleccionar al azar del banco',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limitePreguntas?: number;

  /**
   * Duración en horas del token JWT de invitación.
   * Pasado este tiempo, el link de invitación expira y ya no permite unirse.
   * Por defecto 24 horas. Máximo 168 horas (7 días).
   */
  @ApiPropertyOptional({
    example: 24,
    default: 24,
    description:
      'Duración del token de invitación en horas (default: 24, max: 168)',
  })
  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  duracionTokenHoras?: number;

  /** Cantidad máxima de estudiantes que pueden tener rol 'estudiante' simultáneamente. Por defecto 1 */
  @ApiPropertyOptional({
    example: 3,
    default: 1,
    description: 'Cantidad máxima de estudiantes en la sala',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxEstudiantes?: number;
}
