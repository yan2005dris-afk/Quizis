import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class OpcionDto {
  @ApiProperty({
    example: 'París',
    description: 'Texto de la opción de respuesta',
  })
  @IsString()
  @IsNotEmpty()
  texto: string;

  @ApiProperty({
    example: false,
    description: 'Indica si esta opción es la correcta',
  })
  @IsBoolean()
  esCorrecta: boolean;
}
