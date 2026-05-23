import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedRoles = async (prisma: PrismaClient) => {
  const roles = [
    { nombre: 'ADMIN' },
    { nombre: 'ESTUDIANTE' },
    { nombre: 'OBSERVADOR' },
  ];

  const createdRoles: any[] = [];
  for (const role of roles) {
    const createdRole = await prisma.roles.upsert({
      where: { nombre: role.nombre },
      update: {},
      create: role,
    });
    createdRoles.push(createdRole);
  }

  return createdRoles;
};
