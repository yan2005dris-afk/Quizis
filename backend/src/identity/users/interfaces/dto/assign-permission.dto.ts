import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({
    description: 'ID del permiso a asignar al usuario',
    example: 1,
  })
  @IsInt()
  permisoId: number;

  @ApiPropertyOptional({
    description:
      'Si es true, permite; si es false, revoca el permiso para el usuario',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  permitido?: boolean;
}
