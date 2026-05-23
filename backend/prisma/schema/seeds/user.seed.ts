import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedUSers = async (prisma: PrismaClient, roles: any[]) => {
  const adminRole = roles.find((r) => r.nombre === 'ADMIN');

  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado para el seed de usuarios');
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = {
    email: 'admin@quizis.com',
    clave: hashedPassword,
    nombres: 'Admin',
    apellidos: 'Quizis',
    rolId: adminRole.rolId,
  };

  await prisma.usuarios.upsert({
    where: { email: adminUser.email },
    update: adminUser,
    create: adminUser,
  });
};
