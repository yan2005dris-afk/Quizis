/**
 * Puerto (clase abstracta) de repositorio para Roles.
 */
export abstract class RoleRepository {
  abstract create(data: CreateRoleData): Promise<RoleRecord>;
  abstract findById(id: number): Promise<RoleRecord | null>;
  abstract findByName(name: string): Promise<RoleRecord | null>;
  abstract findAll(): Promise<RoleRecord[]>;
  abstract findOneWithPermissions(
    id: number,
  ): Promise<RoleWithPermissions | null>;
  abstract findOneWithPermissionsOrThrow(
    id: number,
  ): Promise<RoleWithPermissions>;
  abstract update(id: number, data: UpdateRoleData): Promise<void>;
  abstract softDelete(id: number): Promise<void>;
  abstract assignPermission(rolId: number, permisoId: number): Promise<void>;
  abstract removePermission(rolId: number, permisoId: number): Promise<void>;
  abstract findPermissions(rolId: number): Promise<RolePermissionRecord[]>;
  abstract findRolePermissionAssignment(
    rolId: number,
    permisoId: number,
  ): Promise<RolePermissionAssignment | null>;
  abstract restorePermissionAssignment(
    rolId: number,
    permisoId: number,
  ): Promise<void>;
  abstract syncSequence(): Promise<void>;
}

export interface RoleRecord {
  rolId: number;
  nombre: string;
  deletedAt: Date | null;
}

export interface CreateRoleData {
  nombre: string;
}

export interface UpdateRoleData {
  nombre?: string;
}

export interface RoleWithPermissions {
  rolId: number;
  nombre: string;
  permisos: {
    rolPermisoId: number;
    permisoId: number;
    nombre: string;
    descripcion: string;
    recurso: string;
    accion: string;
  }[];
}

export interface RolePermissionRecord {
  recurso: string;
  accion: string;
}

export interface RolePermissionAssignment {
  rolPermisoId: number;
  rolId: number;
  permisoId: number;
  deletedAt: Date | null;
}
