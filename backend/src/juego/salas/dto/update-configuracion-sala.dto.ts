import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ComodinConfigDto {
  @ApiProperty({ example: 1, description: 'ID del comodín' })
  @IsInt()
  comodinId: number;

  @ApiProperty({
    example: true,
    description: 'Estado activo/inactivo del comodín',
  })
  @IsBoolean()
  activo: boolean;
}

export class UpdateConfiguracionSalaDto {
  @ApiPropertyOptional({
    example: 'Clase de Calidad de Software - Editado',
    description: 'Nuevo nombre descriptivo de la sala',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Nuevo límite de preguntas a seleccionar al azar',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limitePreguntas?: number;

  @ApiPropertyOptional({
    type: [ComodinConfigDto],
    description: 'Configuración del estado de los comodines de la sala',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComodinConfigDto)
  @IsOptional()
  comodines?: ComodinConfigDto[];
}
