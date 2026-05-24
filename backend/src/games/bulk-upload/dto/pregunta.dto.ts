import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OpcionDto } from 'src/games/bulk-upload/dto/opcion.dto';

export class PreguntaDto {
  @ApiProperty({ example: '¿Cuál es la capital de Francia?' })
  @IsString()
  @IsNotEmpty()
  texto: string;

  @ApiProperty({
    type: [OpcionDto],
    description:
      'Entre 2 y 10 opciones de respuesta. Exactamente 1 debe ser correcta.',
    minItems: 2,
    maxItems: 10,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opciones: OpcionDto[];

  @ApiProperty({ example: 'Geografía', required: false })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiProperty({ example: 1, required: false, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  nivel?: number;

  @ApiProperty({ example: 1000, required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto?: number;

  @ApiProperty({
    example: '¡Correcto! París es la capital de Francia.',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedbackCorrecto?: string;

  @ApiProperty({ example: 'La respuesta correcta era París.', required: false })
  @IsString()
  @IsOptional()
  feedbackIncorrecto?: string;
}
