import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  PermissionConfig,
} from '../decorators/require-permission.decorator';
import type {
  AuthPermission,
  AuthenticatedRequest,
} from '../types/auth-request.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Intentar obtener el permiso explícito del decorador
    let required = this.reflector.get<PermissionConfig>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    // 2. Si no hay decorador, aplicamos "Seguridad por Convención"
    if (!required) {
      required = this.inferPermission(context);
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.usersId) {
      this.logger.error('Usuario no identificado en request.user');
      throw new ForbiddenException('Usuario no identificado');
    }

    // Permisos cargados por JwtStrategy (fuente de verdad)
    const permissions: AuthPermission[] = Array.isArray(user.permisos)
      ? user.permisos
      : [];

    const hasPermission = permissions.some(
      (p) => p.recurso === required.recurso && p.accion === required.accion,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Acceso denegado: Usuario ${user.email} intentó ${required.accion} en ${required.recurso}`,
      );
      throw new ForbiddenException(
        `No tienes permiso para la acción "${required.accion}" en "${required.recurso}"`,
      );
    }

    return true;
  }

  /**
   * Infiere el permiso basado en el nombre del controlador y el método HTTP.
   * Ej: ClientesController + POST -> resource: "clientes", action: "create"
   */
  private inferPermission(context: ExecutionContext): PermissionConfig {
    const controller = context.getClass().name;
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Limpiar nombre del controlador: ClientesController -> clientes
    const resource = controller
      .replace('Controller', '')
      .replace('Module', '')
      .toLowerCase();

    // Mapeo de métodos HTTP a acciones estándar
    const actionMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    const action = actionMap[method] || 'read';

    this.logger.debug(`Permiso inferido por convención: ${resource}:${action}`);

    return { recurso: resource, accion: action };
  }
}
