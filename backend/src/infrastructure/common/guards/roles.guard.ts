import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/require-role.decorator';
import { JwtRequest } from '../../../identity/auth/types/JwtRequest.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<JwtRequest>();
    const user = request.user;

    if (!user || !user.rolNombre) {
      throw new ForbiddenException('No autorizado: no tienes rol asignado');
    }

    const hasRole = requiredRoles.includes(user.rolNombre);

    if (!hasRole) {
      throw new ForbiddenException(
        `No autorizado: se requiere rol ${requiredRoles.join(' o ')}`,
      );
    }

    return true;
  }
}
