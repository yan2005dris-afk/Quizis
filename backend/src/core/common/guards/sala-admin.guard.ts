import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/auth-request.types';

/**
 * Validates that the authenticated user is the admin of the sala identified by
 * the `:salaId` URL parameter. The `:salaId` in this codebase is actually the
 * `tokenCompartido` (see Salas.tokenCompartido).
 *
 * Use after JwtAuthGuard so `request.user` is populated.
 *
 * Attaches the resolved `sala` to `request.sala` for downstream handlers.
 */
@Injectable()
export class SalaAdminGuard implements CanActivate {
  private readonly logger = new Logger(SalaAdminGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { sala?: any }>();
    const user = request.user;
    const tokenCompartido: string | undefined =
      typeof request.params?.salaId === 'string'
        ? request.params.salaId
        : Array.isArray(request.params?.salaId)
          ? request.params.salaId[0]
          : undefined;

    if (!user || !user.usersId) {
      throw new ForbiddenException('Usuario no identificado');
    }
    if (!tokenCompartido) {
      throw new ForbiddenException('salaId requerido en la URL');
    }

    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
      select: { salaId: true, adminId: true, estado: true },
    });

    if (!sala) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (sala.adminId !== user.usersId) {
      this.logger.warn(
        `Acceso denegado: usuario ${user.usersId} intentó operar sala ${sala.salaId} (admin=${sala.adminId})`,
      );
      throw new ForbiddenException(
        'Solo el admin de esta sala puede ejecutar esta acción',
      );
    }

    request.sala = sala;
    return true;
  }
}
