import { PrismaService } from 'src/core/database/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// ─── Guard: falla temprano si DATABASE_URL no apunta a DB de test ─────────────
const dbUrl = process.env.DATABASE_URL ?? '';
const isTestDb =
  dbUrl.includes('quizis_test') ||
  dbUrl.includes('test') ||
  process.env.NODE_ENV === 'test';

if (!isTestDb) {
  throw new Error(
    `[db-test.helper] DATABASE_URL no apunta a una DB de test.\n` +
      `  URL actual: ${dbUrl}\n` +
      `  Los integration tests hacen INSERT/DELETE reales.\n` +
      `  Configura backend/.env.test con una DB dedicada (ej: quizis_test).`,
  );
}

// ─── Identificadores únicos por ejecución ─────────────────────────────────────
// Sufijo UUID corto evita colisiones entre ejecuciones paralelas o
// cleanup fallidos previos — sin necesidad de lógica de "rescue".
const RUN_ID = randomUUID().slice(0, 8);

export const TEST_AUTH_USER = {
  email: `integration-auth-${RUN_ID}@quizis.local`,
  password: 'Test@Integration1!',
  nombres: 'Integration',
  apellidos: 'Test',
};

const TEST_ROLE_NAME = `__integration_test_role_${RUN_ID}__`;

export interface SeededTestData {
  userId: number;
  roleId: number;
  runId: string;
}

/**
 * Crea rol y usuario de prueba con IDs únicos por ejecución.
 * No necesita lógica de "rescue" — el sufijo UUID garantiza que
 * no colisiona con ejecuciones anteriores ni con datos reales.
 */
export async function seedAuthTestData(
  prisma: PrismaService,
): Promise<SeededTestData> {
  const hashedPassword = await bcrypt.hash(TEST_AUTH_USER.password, 10);

  const role = await prisma.roles.create({
    data: { nombre: TEST_ROLE_NAME },
  });

  const user = await prisma.usuarios.create({
    data: {
      email: TEST_AUTH_USER.email,
      clave: hashedPassword,
      nombres: TEST_AUTH_USER.nombres,
      apellidos: TEST_AUTH_USER.apellidos,
      rolId: role.rolId,
    },
  });

  return { userId: user.usuarioId, roleId: role.rolId, runId: RUN_ID };
}

/**
 * Elimina exactamente los registros creados por seedAuthTestData.
 * Seguro: opera por IDs numéricos, no por email ni nombre de rol.
 */
export async function cleanAuthTestData(
  prisma: PrismaService,
  data: SeededTestData,
): Promise<void> {
  await prisma.sesiones.deleteMany({ where: { usuarioId: data.userId } });
  await prisma.usuarios.deleteMany({ where: { usuarioId: data.userId } });
  await prisma.roles.deleteMany({ where: { rolId: data.roleId } });
}
