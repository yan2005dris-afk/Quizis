import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateOpcionDto {
  @ApiProperty({ description: 'ID de la opción' })
  @IsInt()
  @IsOptional()
  opcionId?: number;

  @ApiProperty({ description: 'ID de la pregunta' })
  @IsInt()
  @IsOptional()
  preguntaId?: number;

  @ApiProperty({ description: 'Texto de la opción' })
  @IsString()
  texto: string;

  @ApiProperty({ description: 'Indica si es la respuesta correcta' })
  @IsBoolean()
  esCorrecta: boolean;

  @IsOptional()
  createdAt?: any;
  @IsOptional()
  updatedAt?: any;
  @IsOptional()
  deletedAt?: any;
}

export class UpdatePreguntaDto {
  @IsInt()
  @IsOptional()
  preguntaId?: number;

  @IsInt()
  @IsOptional()
  bancoId?: number;

  @ApiPropertyOptional({ description: 'Texto de la pregunta' })
  @IsString()
  @IsOptional()
  texto?: string;

  @ApiPropertyOptional({ description: 'Categoría de la pregunta' })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({ description: 'Nivel de dificultad (1-5)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  nivel?: number;

  @ApiPropertyOptional({ description: 'Monto o puntos asignados' })
  @IsNumber()
  @IsOptional()
  monto?: number;

  @ApiPropertyOptional({ description: 'Feedback para respuesta correcta' })
  @IsString()
  @IsOptional()
  feedbackCorrecto?: string;

  @ApiPropertyOptional({ description: 'Feedback para respuesta incorrecta' })
  @IsString()
  @IsOptional()
  feedbackIncorrecto?: string;

  @ApiPropertyOptional({ description: 'Tiempo límite en segundos' })
  @IsInt()
  @Min(5)
  @IsOptional()
  tiempoLimite?: number;

  @ApiProperty({
    type: [UpdateOpcionDto],
    description: 'Listado completo de opciones',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOpcionDto)
  @IsOptional()
  opciones?: UpdateOpcionDto[];

  @IsOptional()
  createdAt?: any;
  @IsOptional()
  updatedAt?: any;
  @IsOptional()
  deletedAt?: any;
}
