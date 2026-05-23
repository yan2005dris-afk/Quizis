import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignRolePermissionDto {
  @ApiProperty({
    description: 'ID del permiso a asignar al rol',
    example: 1,
  })
  @IsInt()
  permissionsId: number;
}
