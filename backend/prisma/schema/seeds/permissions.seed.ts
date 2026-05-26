import { PrismaClient } from '../../../src/generated/prisma/client';

/**
 * Seed para los permisos del módulo de salas y rondas.
 *
 * Crea los permisos requeridos para las acciones de los controladores
 * y los asocia al rol de ADMIN para habilitar las pruebas locales.
 */
export const seedPermissions = async (prisma: PrismaClient, roles: any[]) => {
  const adminRole = roles.find((r) => r.nombre === 'ADMIN');
  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado para el seed de permisos');
  }

  const permisosList = [
    // --- Permisos para SALAS ---
    {
      nombre: 'Crear Sala',
      descripcion: 'Permite crear una sala de juego con link de invitación',
      recurso: 'salas',
      accion: 'create',
    },
    {
      nombre: 'Ver Sala',
      descripcion: 'Permite ver los detalles técnicos de una sala',
      recurso: 'salas',
      accion: 'read',
    },
    {
      nombre: 'Actualizar Sala',
      descripcion: 'Permite actualizar estado, configuración o regenerar tokens',
      recurso: 'salas',
      accion: 'update',
    },
    {
      nombre: 'Eliminar Sala',
      descripcion: 'Permite borrar o archivar una sala',
      recurso: 'salas',
      accion: 'delete',
    },

    // --- Permisos para RONDAS ---
    {
      nombre: 'Crear Ronda',
      descripcion: 'Permite iniciar una ronda de juego',
      recurso: 'rondas',
      accion: 'create',
    },
    {
      nombre: 'Ver Ronda',
      descripcion: 'Permite ver el progreso de la ronda',
      recurso: 'rondas',
      accion: 'read',
    },
    {
      nombre: 'Actualizar Ronda',
      descripcion: 'Permite cambiar estados de ronda o liberar preguntas',
      recurso: 'rondas',
      accion: 'update',
    },
    {
      nombre: 'Eliminar Ronda',
      descripcion: 'Permite borrar una ronda',
      recurso: 'rondas',
      accion: 'delete',
    },

    // --- Permisos para BANCOS (Auxiliares) ---
    {
      nombre: 'Ver Bancos',
      recurso: 'bancos',
      accion: 'read',
    },
    {
      nombre: 'Crear Bancos',
      recurso: 'bancos',
      accion: 'create',
    },
  ];

  console.log(`🔑 Procesando ${permisosList.length} permisos para el rol ADMIN...`);

  for (const perm of permisosList) {
    // 1. Upsert del permiso (evitar duplicados por recurso/accion)
    let dbPermiso = await prisma.permisos.findFirst({
      where: { recurso: perm.recurso, accion: perm.accion },
    });

    if (!dbPermiso) {
      dbPermiso = await prisma.permisos.create({
        data: {
          nombre: perm.nombre || `${perm.recurso}:${perm.accion}`,
          descripcion: perm.descripcion || 'Sin descripción',
          recurso: perm.recurso,
          accion: perm.accion,
        },
      });
    }

    // 2. Vincular al ADMIN (Upsert en la tabla relacional)
    await prisma.rolPermisos.upsert({
      where: {
        rolId_permisoId: {
          rolId: adminRole.rolId,
          permisoId: dbPermiso.permisoId,
        },
      },
      update: {
        deletedAt: null, // Asegurar que no esté marcado como borrado
      },
      create: {
        rolId: adminRole.rolId,
        permisoId: dbPermiso.permisoId,
      },
    });
  }
};
