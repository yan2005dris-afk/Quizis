import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional({
    description: 'IDs de permisos a asignar al rol',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permisosAsignar?: number[];

  @ApiPropertyOptional({
    description: 'IDs de permisos a revocar del rol',
    example: [4, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permisosRevocar?: number[];
}
