/**
 * Puerto (clase abstracta) de repositorio para Sesiones.
 */
export abstract class SessionRepository {
  abstract create(data: CreateSessionData): Promise<SessionRecord>;
  abstract findById(id: string): Promise<SessionRecord | null>;
  abstract findByUserAndSession(
    usuarioId: number,
    sesionId: string,
  ): Promise<SessionRecord | null>;
  abstract update(id: string, data: UpdateSessionData): Promise<void>;
  abstract revoke(id: string): Promise<void>;
  abstract listByUser(usuarioId: number): Promise<SessionRecord[]>;
}

export interface SessionRecord {
  sesionId: string;
  usuarioId: number;
  hashRefreshToken: string;
  direccionIp: string | null;
  usuarioAgente: string | null;
  revocado: boolean;
  expiraEn: Date;
  createdAt: Date;
  usuario?: {
    usuarioId: number;
    email: string;
  } | null;
}

export interface CreateSessionData {
  sesionId: string;
  hashRefreshToken: string;
  direccionIp?: string;
  usuarioAgente?: string;
  revocado?: boolean;
  expiraEn: Date;
  usuario: { connect: { usuarioId: number } };
}

export interface UpdateSessionData {
  hashRefreshToken?: string;
  direccionIp?: string;
  usuarioAgente?: string;
  revocado?: boolean;
  expiraEn?: Date;
}
