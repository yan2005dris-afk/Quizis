import type { Request } from 'express';

export type AuthPermission = {
  recurso: string;
  accion: string;
};

export type AuthUser = {
  usersId: number;
  email?: string;
  permisos?: AuthPermission[];
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
