import { PrismaClient } from '../../../src/generated/prisma/client';

/**
 * Seed para los permisos del módulo de salas.
 *
 * Crea los permisos requeridos para las acciones del controlador de salas
 * y los asocia al rol de ADMIN para habilitar las pruebas locales.
 */
export const seedPermissions = async (prisma: PrismaClient, roles: any[]) => {
  const adminRole = roles.find((r) => r.nombre === 'ADMIN');
  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado para el seed de permisos');
  }

  const permisosSalas = [
    {
      nombre: 'Crear Sala',
      descripcion: 'Permite crear una sala de juego con link de invitación',
      recurso: 'salas',
      accion: 'create',
    },
    {
      nombre: 'Actualizar Sala',
      descripcion: 'Permite actualizar el estado de una sala de juego',
      recurso: 'salas',
      accion: 'update',
    },
  ];

  for (const perm of permisosSalas) {
    // Buscar si ya existe el permiso por recurso y accion
    let dbPermiso = await prisma.permisos.findFirst({
      where: { recurso: perm.recurso, accion: perm.accion },
    });

    if (!dbPermiso) {
      dbPermiso = await prisma.permisos.create({
        data: perm,
      });
    }

    // Vincular el permiso al rol ADMIN en la tabla intermedia rol_permisos
    await prisma.rolPermisos.upsert({
      where: {
        rolId_permisoId: {
          rolId: adminRole.rolId,
          permisoId: dbPermiso.permisoId,
        },
      },
      update: {},
      create: {
        rolId: adminRole.rolId,
        permisoId: dbPermiso.permisoId,
      },
    });
  }
};
