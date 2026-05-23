import type { Prisma } from 'src/generated/prisma/client';

// ============================================
// Safe Prisma Selects
// ============================================

export const safeUserSelect = {
  usuarioId: true,
  email: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  avatar: true,
} satisfies Prisma.UsuariosSelect;

export const userWithRolesSelect = {
  usuarioId: true,
  email: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  avatar: true,
  deletedAt: true,
  rol: {
    select: {
      rolId: true,
      nombre: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.UsuariosSelect;

// ============================================
// Frontend Response Types
// ============================================

export interface UserResponse {
  usuarioId: number;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  avatar: unknown;
}

export interface UserWithRoleResponse extends UserResponse {
  rol: {
    rolId: number;
    nombre: string;
  } | null;
}

export interface UserWithPermissionsResponse extends UserWithRoleResponse {
  permisosRol: AuthPermissionResponse[];
}

export interface AuthPermissionResponse {
  recurso: string;
  accion: string;
}

export interface RolePermissionResponse {
  recurso: string;
  accion: string;
}

export interface ProfileResponse {
  usuarioId: number;
  email: string;
  nombre: string | null;
  telefono: string | null;
  avatar: { url?: string; key?: string } | null;
  rol: {
    rolId: number;
    nombre: string;
  } | null;
}

export interface EffectivePermissionsResponse {
  usuarioId: number;
  permisos: AuthPermissionResponse[];
}
