import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la creación de una nueva ronda de juego.
 *
 * Una ronda representa un intento individual de un participante (estudiante)
 * dentro de una sala. Al crearse, se le asignan preguntas aleatorias
 * exclusivas para ese intento.
 */
export class CreateRondaDto {
  /** ID de la sala de juego donde se crea la ronda */
  @ApiProperty({ example: 1, description: 'ID de la sala' })
  @IsInt()
  @IsNotEmpty()
  salaId: number;

  /** ID del participante (estudiante) al que se le asigna esta ronda */
  @ApiProperty({ example: 5, description: 'ID del participante (estudiante)' })
  @IsInt()
  @IsNotEmpty()
  participanteId: number;

  /** Número secuencial del intento del estudiante en esta sala (1, 2, 3...) */
  @ApiProperty({
    example: 1,
    description: 'Número de intento o ronda del estudiante',
  })
  @IsInt()
  @IsNotEmpty()
  numeroRonda: number;
}
