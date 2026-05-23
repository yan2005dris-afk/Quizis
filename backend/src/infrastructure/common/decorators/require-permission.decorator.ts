import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface PermissionConfig {
  recurso: string;
  accion: string;
}

export const RequiredPermission = (recurso: string, accion: string) =>
  SetMetadata(PERMISSION_KEY, { recurso, accion });
