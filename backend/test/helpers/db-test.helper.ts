import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export const TEST_AUTH_USER = {
  email: 'integration-auth-test@quizis.local',
  password: 'Test@Integration1!',
  nombres: 'Integration',
  apellidos: 'Test',
};

const TEST_ROLE_NAME = '__integration_test_role__';

export interface SeededTestData {
  userId: number;
  roleId: number;
}

/**
 * Crea rol y usuario de prueba en la DB.
 * Usa upsert en el rol y create en el usuario para evitar colisiones.
 */
export async function seedAuthTestData(
  prisma: PrismaService,
): Promise<SeededTestData> {
  const hashedPassword = await bcrypt.hash(TEST_AUTH_USER.password, 10);

  const role = await prisma.roles.upsert({
    where: { nombre: TEST_ROLE_NAME },
    update: {},
    create: { nombre: TEST_ROLE_NAME },
  });

  // Si ya existe el usuario de test anterior (cleanup fallido), limpiarlo
  const existing = await prisma.usuarios.findUnique({
    where: { email: TEST_AUTH_USER.email },
  });
  if (existing) {
    await prisma.sesiones.deleteMany({
      where: { usuarioId: existing.usuarioId },
    });
    await prisma.usuarios.delete({ where: { usuarioId: existing.usuarioId } });
  }

  const user = await prisma.usuarios.create({
    data: {
      email: TEST_AUTH_USER.email,
      clave: hashedPassword,
      nombres: TEST_AUTH_USER.nombres,
      apellidos: TEST_AUTH_USER.apellidos,
      rolId: role.rolId,
    },
  });

  return { userId: user.usuarioId, roleId: role.rolId };
}

/**
 * Elimina todos los datos creados por seedAuthTestData.
 * Llama siempre en afterAll para no contaminar la DB.
 */
export async function cleanAuthTestData(
  prisma: PrismaService,
  data: SeededTestData,
): Promise<void> {
  await prisma.sesiones.deleteMany({ where: { usuarioId: data.userId } });
  await prisma.usuarios.deleteMany({ where: { usuarioId: data.userId } });
  await prisma.roles.deleteMany({ where: { rolId: data.roleId } });
}
