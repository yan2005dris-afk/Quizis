import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedUSers = async (prisma: PrismaClient, roles: any[]) => {
  const adminRole = roles.find((r) => r.nombre === 'ADMIN');

  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado para el seed de usuarios');
  }

  const admins = [
    { email: 'admin@quizis.com',    clave: 'admin123',    nombres: 'Admin',    apellidos: 'Quizis' },
    { email: 'yandris@quizis.com',  clave: 'yandris123',  nombres: 'Yandris',  apellidos: ''       },
    { email: 'andy@quizis.com',     clave: 'andy123',     nombres: 'Andy',     apellidos: ''       },
    { email: 'said@quizis.com',     clave: 'said123',     nombres: 'Said',     apellidos: ''       },
    { email: 'diana@quizis.com',    clave: 'diana123',    nombres: 'Diana',    apellidos: ''       },
    { email: 'allison@quizis.com',  clave: 'allison123',  nombres: 'Allison',  apellidos: ''       },
    { email: 'gino@quizis.com',     clave: 'gino123',     nombres: 'Gino',     apellidos: ''       },
    { email: 'angel@quizis.com',    clave: 'angel123',    nombres: 'Angel',    apellidos: ''       },
    { email: 'pachay@quizis.com',   clave: 'pachay123',   nombres: 'Pachay',   apellidos: ''       },
    { email: 'anthony@quizis.com',  clave: 'anthony123',  nombres: 'Anthony',  apellidos: ''       },
  ];

  for (const admin of admins) {
    const hashed = await bcrypt.hash(admin.clave, 10);
    const data = {
      email: admin.email,
      clave: hashed,
      nombres: admin.nombres,
      apellidos: admin.apellidos,
      rolId: adminRole.rolId,
    };
    await prisma.usuarios.upsert({
      where: { email: data.email },
      update: data,
      create: data,
    });
  }
};
