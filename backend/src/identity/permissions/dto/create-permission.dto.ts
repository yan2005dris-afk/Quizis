import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Gestión de usuarios' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: 'Permite crear, leer, actualizar y eliminar usuarios',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 'users' })
  @IsString()
  @IsNotEmpty()
  recurso: string;

  @ApiProperty({ example: 'read' })
  @IsString()
  @IsNotEmpty()
  accion: string;
}
