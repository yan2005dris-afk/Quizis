import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from 'src/generated/prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario (debe ser único)',
    example: 'usuario@jasrapo.com',
    format: 'email',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Nombres del usuario',
    example: 'Juan',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({
    description: 'Apellidos del usuario',
    example: 'Pérez',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({
    description:
      'Teléfono del usuario (formato Ecuador: +593XXXXXXXXX o 09XXXXXXXX)',
    example: '+593991234567',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({
    description: 'Avatar del usuario (JSON con url y key)',
    example: {
      url: 'https://example.com/avatar.png',
      key: 'avatars/user.png',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  avatar?: Prisma.InputJsonValue;

  @ApiProperty({
    description:
      'ID del rol a asignar (opcional). Si no se envía, se asigna el rol "user" por defecto',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rolId?: number;
}
