import { IsString, MinLength, MaxLength, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class NestedOpcionDto {
  @IsString()
  texto: string;

  @IsOptional()
  esCorrecta?: boolean;
}

class NestedPreguntaDto {
  @IsString()
  texto: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  nivel?: number;

  @IsOptional()
  monto?: number;

  @IsOptional()
  @IsString()
  feedbackCorrecto?: string;

  @IsOptional()
  @IsString()
  feedbackIncorrecto?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedOpcionDto)
  opciones: NestedOpcionDto[];
}

export class CreateBancoDto {
  @ApiProperty({
    description: 'Nombre del banco de preguntas',
    example: 'Geografía Mundial',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre: string;

  @ApiProperty({
    description: 'Descripción opcional del banco',
    example: 'Preguntas sobre países, capitales y banderas',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({
    description: 'Preguntas opcionales para crear junto con el banco',
    type: [NestedPreguntaDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedPreguntaDto)
  preguntas?: NestedPreguntaDto[];
}
