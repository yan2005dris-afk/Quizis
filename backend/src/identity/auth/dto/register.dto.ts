import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Correo electrónico del nuevo usuario',
    example: 'nuevo@jasrapo.com',
    format: 'email',
    required: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
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
    description: 'ID del rol (opcional)',
    example: 1,
    required: false,
  })
  @IsString()
  rolId?: string;
}
