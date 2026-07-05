import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';
import { ValidationUtil } from 'src/core/common/utils/validation.util';
import { PhoneUtil } from 'src/core/common/utils/phone.util';
import { UserRepository } from '../../domain/repositories/user.repository';
import type { CreateUserData } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async execute(createUsersDto: CreateUserDto) {
    // Validar campos obligatorios
    ValidationUtil.requireNonEmpty(createUsersDto.email, 'email');
    ValidationUtil.requireNonEmpty(createUsersDto.nombres, 'nombres');
    ValidationUtil.requireNonEmpty(createUsersDto.apellidos, 'apellidos');
    ValidationUtil.requireNonEmpty(createUsersDto.telefono, 'telefono');

    const cleanPhone = PhoneUtil.validateAndClean(
      createUsersDto.telefono,
      'telefono',
    );

    // Verificar que el email no exista previamente (incluye usuarios eliminados)
    const existingUser = await this.userRepo.findByEmailIncludingDeleted(
      createUsersDto.email,
    );
    if (existingUser) {
      if (existingUser.deletedAt) {
        throw new ConflictException(
          'El correo electrónico pertenece a un usuario eliminado. Contacte al administrador para restaurar el usuario.',
        );
      }
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // Determinar el rol a asignar
    let roleId: number;
    let roleName: string;

    if (createUsersDto.rolId) {
      const role = await this.roleRepo.findById(createUsersDto.rolId);
      if (!role || role.deletedAt) {
        throw new NotFoundException('Rol no encontrado o eliminado');
      }
      roleId = role.rolId;
      roleName = role.nombre;
    } else {
      const defaultRole = await this.roleRepo.findByName('user');
      if (!defaultRole) {
        throw new Error('No existe el rol por defecto "user".');
      }
      if (defaultRole.deletedAt) {
        throw new NotFoundException('Rol no encontrado o eliminado');
      }
      roleId = defaultRole.rolId;
      roleName = defaultRole.nombre;
    }

    // TODO: Generar contraseña temporal y enviar por email
    // Por ahora se crea con un hash placeholder
    const temporaryPassword = 'TEMP_' + Date.now();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    try {
      const newUser = await this.userRepo.create({
        email: createUsersDto.email,
        clave: hashedPassword,
        nombres: createUsersDto.nombres,
        apellidos: createUsersDto.apellidos,
        telefono: cleanPhone,
        avatar: createUsersDto.avatar,
        rolId: roleId,
      } satisfies CreateUserData);

      return {
        usuarioId: newUser.usuarioId,
        email: newUser.email,
        nombres: newUser.nombres,
        apellidos: newUser.apellidos,
        telefono: newUser.telefono,
        avatar: newUser.avatar,
        rol: {
          rolId: roleId,
          nombre: roleName,
        },
      };
    } catch (error) {
      // Manejar error de constraint único de Prisma
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybeError = error as { code?: string; meta?: { target?: unknown } };
    return maybeError.code === 'P2002';
  }
}
