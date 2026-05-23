import { ApiProperty } from '@nestjs/swagger';

export class RoleEntity {
  @ApiProperty({ example: 1, description: 'ID único del rol' })
  rolId: number;

  @ApiProperty({ example: 'admin', description: 'Nombre descriptivo del rol' })
  nombre: string;
}

export class AuthPermissionEntity {
  @ApiProperty({ example: 'users', description: 'Nombre del recurso' })
  recurso: string;

  @ApiProperty({ example: 'read', description: 'Acción permitida' })
  accion: string;
}

export class UserProfileEntity {
  @ApiProperty({ example: 1, description: 'ID único del usuario' })
  usuarioId: number;

  @ApiProperty({
    example: 'usuario@jasrapo.com',
    description: 'Correo electrónico',
  })
  email: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo concatenado',
    nullable: true,
  })
  nombre: string | null;

  @ApiProperty({
    example: '+593991234567',
    description: 'Número de teléfono (formato Ecuador)',
    nullable: true,
  })
  telefono: string | null;

  @ApiProperty({
    example: { url: 'avatars/profile.png', key: 'profile.png' },
    description: 'Datos del avatar (JSON)',
    nullable: true,
  })
  avatar: unknown;

  @ApiProperty({
    type: () => RoleEntity,
    description: 'Rol asignado al usuario',
    nullable: true,
  })
  rol: RoleEntity | null;
}

export class UserEntity {
  @ApiProperty({ example: 1, description: 'ID único del usuario' })
  usuarioId: number;

  @ApiProperty({
    example: 'usuario@jasrapo.com',
    description: 'Correo electrónico',
  })
  email: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombres del usuario',
    nullable: true,
  })
  nombres: string | null;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellidos del usuario',
    nullable: true,
  })
  apellidos: string | null;

  @ApiProperty({
    example: '+593991234567',
    description: 'Teléfono (formato Ecuador)',
    nullable: true,
  })
  telefono: string | null;

  @ApiProperty({
    example: { url: 'avatars/profile.png', key: 'profile.png' },
    description: 'Datos del avatar (JSON)',
    nullable: true,
  })
  avatar: unknown;

  @ApiProperty({
    type: () => RoleEntity,
    description: 'Rol asignado',
    nullable: true,
  })
  rol: RoleEntity | null;
}

export class UserDetailEntity extends UserEntity {
  @ApiProperty({
    type: [AuthPermissionEntity],
    description: 'Permisos heredados por el rol',
  })
  permisosRol: AuthPermissionEntity[];
}
