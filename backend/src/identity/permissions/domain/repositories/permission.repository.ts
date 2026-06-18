/**
 * Puerto (clase abstracta) de repositorio para Permisos.
 */
export abstract class PermissionRepository {
  abstract create(data: CreatePermissionData): Promise<PermissionRecord>;
  abstract findById(id: number): Promise<PermissionRecord | null>;
  abstract findAll(): Promise<PermissionRecord[]>;
  abstract update(id: number, data: UpdatePermissionData): Promise<void>;
  abstract remove(id: number): Promise<void>;
  abstract findByRoleId(rolId: number): Promise<RolePermissionRecord[]>;
}

export interface PermissionRecord {
  permisoId: number;
  nombre: string;
  descripcion: string;
  recurso: string;
  accion: string;
  deletedAt: Date | null;
}

export interface CreatePermissionData {
  nombre: string;
  descripcion: string;
  recurso: string;
  accion: string;
}

export interface UpdatePermissionData {
  nombre?: string;
  descripcion?: string;
  recurso?: string;
  accion?: string;
}

export interface RolePermissionRecord {
  recurso: string;
  accion: string;
}
