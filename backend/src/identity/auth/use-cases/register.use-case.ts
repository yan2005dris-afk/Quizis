import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from 'src/identity/users/user.service';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private readonly userService: UserService) {}

  async execute(registerDto: RegisterDto) {
    const user = await this.userService.user({ email: registerDto.email });

    if (user) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const createUserData: any = {
      email: registerDto.email,
      nombres: registerDto.nombres,
      apellidos: registerDto.apellidos,
      telefono: registerDto.telefono,
    };

    // Agregar rolId si se proporciona
    if (registerDto.rolId) {
      createUserData.rolId = parseInt(registerDto.rolId, 10);
    }

    const newUser = await this.userService.createUser(createUserData);

    if (newUser) {
      return {
        message: 'El registro fue exitoso',
        usuarioId: newUser.usuarioId,
      };
    } else {
      throw new BadRequestException('Error al registrar el usuario');
    }
  }
}
