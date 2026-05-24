import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalaDto {
  @ApiProperty({ description: 'Nombre de la sala', example: 'Quiz de Historia' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'ID del banco de preguntas a utilizar', example: 1 })
  @IsInt()
  @IsNotEmpty()
  bancoId: number;

  @ApiProperty({ description: 'Límite de preguntas por ronda', example: 15, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  limitePreguntas?: number;
}
