import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitRondaDto {
  @ApiProperty({ description: 'ID de la sala', example: 1 })
  @IsInt()
  @IsNotEmpty()
  salaId: number;

  @ApiProperty({ description: 'ID del participante (estudiante) que jugará', example: 1 })
  @IsInt()
  @IsNotEmpty()
  participanteId: number;
}
