import { UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/auth-request.types';

export const AuthUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const usersId = request.user?.usersId;

    if (typeof usersId !== 'number') {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return usersId;
  },
);
