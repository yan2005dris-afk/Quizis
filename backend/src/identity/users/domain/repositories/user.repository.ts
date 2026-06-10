/**
 * Puerto (clase abstracta) de repositorio para Usuarios.
 *
 * Define las operaciones de persistencia que necesita la capa de aplicación,
 * sin acoplarse a ninguna tecnología concreta de base de datos.
 */
export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findByEmailIncludingDeleted(
    email: string,
  ): Promise<UserRecord | null>;
  abstract findById(id: number): Promise<UserRecord | null>;
  abstract findByUniqueInput(input: {
    usuarioId?: number;
    email?: string;
  }): Promise<UserRecord | null>;
  abstract create(data: CreateUserData): Promise<UserRecord>;
  abstract update(id: number, data: UpdateUserData): Promise<void>;
  abstract softDelete(id: number): Promise<void>;
  abstract paginate(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<UserRecord>>;
}

export interface UserRecord {
  usuarioId: number;
  email: string;
  clave: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  avatar: unknown;
  rolId: number | null;
  deletedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  rol?: {
    rolId: number;
    nombre: string;
    deletedAt: Date | null;
  } | null;
}

export interface CreateUserData {
  email: string;
  clave: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  avatar?: unknown;
  rolId: number;
}

export interface UpdateUserData {
  email?: string;
  clave?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  avatar?: unknown;
  rolId?: number | null;
  deletedAt?: Date | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    ultimaPagina: number;
    paginaActual: number;
    porPagina: number;
    anterior: number | null;
    siguiente: number | null;
  };
}
