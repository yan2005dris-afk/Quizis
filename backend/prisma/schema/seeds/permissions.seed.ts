import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedPermissions = async (prisma: PrismaClient, roles: any[]) => {
  const adminRole = roles.find((r) => r.nombre === 'ADMIN');
  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado para el seed de permisos');
  }

  const permissions = [
    // Permisos para BANCOS
    { nombre: 'Ver bancos', descripcion: 'Permite listar y ver detalle de bancos', recurso: 'bancos', accion: 'read' },
    { nombre: 'Crear bancos', descripcion: 'Permite crear bancos y preguntas', recurso: 'bancos', accion: 'create' },
    { nombre: 'Actualizar bancos', descripcion: 'Permite editar bancos y preguntas', recurso: 'bancos', accion: 'update' },
    { nombre: 'Eliminar bancos', descripcion: 'Permite borrar bancos', recurso: 'bancos', accion: 'delete' },
    
    // Permisos para USERS (para que el controlador de users también funcione)
    { nombre: 'Ver usuarios', descripcion: 'Permite listar usuarios', recurso: 'users', accion: 'read' },
    { nombre: 'Crear usuarios', descripcion: 'Permite crear nuevos usuarios', recurso: 'users', accion: 'create' },
    { nombre: 'Actualizar usuarios', descripcion: 'Permite editar usuarios', recurso: 'users', accion: 'update' },
    { nombre: 'Eliminar usuarios', descripcion: 'Permite borrar usuarios', recurso: 'users', accion: 'delete' },
  ];

  for (const p of permissions) {
    let permission = await prisma.permisos.findFirst({
      where: { recurso: p.recurso, accion: p.accion }
    });

    if (!permission) {
      permission = await prisma.permisos.create({ data: p });
    }

    // 2. Asignar al ADMIN
    await prisma.rolPermisos.upsert({
      where: {
        rolId_permisoId: {
          rolId: adminRole.rolId,
          permisoId: permission.permisoId,
        },
      },
      create: {
        rolId: adminRole.rolId,
        permisoId: permission.permisoId,
      },
      update: {
        deletedAt: null,
      },
    });
  }
};
