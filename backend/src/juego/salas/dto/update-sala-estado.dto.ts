import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EstadoSala {
  BORRADOR = 'borrador',
  ESPERANDO = 'esperando',
  EN_VIVO = 'en_vivo',
  FINALIZADO = 'finalizado',
}

export class UpdateSalaEstadoDto {
  @ApiProperty({
    description: 'Nuevo estado de la sala',
    enum: EstadoSala,
    example: EstadoSala.ESPERANDO,
  })
  @IsEnum(EstadoSala)
  @IsNotEmpty()
  estado: EstadoSala;
}
