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

export type ParticipantRole = 'admin' | 'estudiante' | 'observador';

export type ParticipanteInfo = {
  role: ParticipantRole;
  participanteId?: number;
  userId?: number;
};

export type ParticipantRequest = AuthenticatedRequest & {
  participante?: ParticipanteInfo;
};
