import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { seedRoles } from './seeds/role.seed';
import { seedPermissions } from './seeds/permissions.seed';
import { seedUSers } from './seeds/user.seed';
import { seedComodines } from './seeds/comodines.seed';
import { seedPreguntas } from './seeds/preguntas.seed';
import { seedPermissions } from './seeds/permissions.seed';
import { seedRondas } from './seeds/rondas.seed';

// Cargar env desde el root de forma explícita
dotenv.config({ path: path.join(__dirname, '../../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en el archivo .env');
}

console.log('🌱 Iniciando conexión a la base de datos...');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('🌱 Seeding database...');

  console.log('🧹 Limpiando base de datos...');
  try {
    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
    }
    console.log('✅ Base de datos limpiada correctamente desde 0.');
  } catch (error) {
    console.error('❌ Error limpiando base de datos', error);
  }

  // Roles
  console.log('🎭 Creando roles...');
  const roles = await seedRoles(prisma);
  console.log('✅ Roles creados correctamente.');

  // Permisos
  console.log('🔑 Creando y asignando permisos...');
  await seedPermissions(prisma, roles);
  console.log('✅ Permisos asignados correctamente.');

  // Comodines
  console.log('🃏 Creando catálogo de comodines...');
  await seedComodines(prisma);
  console.log('✅ Catálogo de comodines creado.');

  // Usuarios
  console.log('👤 Creando usuario admin...');
  await seedUSers(prisma, roles);
  console.log('✅ Usuarios creados correctamente.');

  // Permisos
  console.log('🔑 Asignando permisos del módulo de salas...');
  await seedPermissions(prisma, roles);
  console.log('✅ Permisos asignados correctamente.');

  // Bancos y Preguntas
  console.log('📚 Creando bancos de preguntas y preguntas...');
  await seedPreguntas(prisma);
  console.log('✅ Bancos de preguntas y preguntas creados.');

  // Rondas
  console.log('🔄 Creando salas de juego, participantes y rondas...');
  await seedRondas(prisma);
  console.log('✅ Rondas y participantes creados.');

  console.log('✅ Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
