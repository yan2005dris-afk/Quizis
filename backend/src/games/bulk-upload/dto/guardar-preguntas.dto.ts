import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { PreguntaDto } from 'src/games/bulk-upload/dto/pregunta.dto';

export class GuardarPreguntasDto {
  @ApiProperty({
    example: 1,
    description: 'ID del banco de preguntas donde se guardarán las preguntas',
  })
  @IsInt()
  @IsPositive()
  bancoId: number;

  @ApiProperty({
    type: [PreguntaDto],
    description: 'Lista de preguntas a guardar (mínimo 1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreguntaDto)
  preguntas: PreguntaDto[];
}
