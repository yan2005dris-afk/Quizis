/**
 * setup.ts — Obtiene IDs reales de DB para los archivos de stress test.
 * Uso: DATABASE_URL="postgresql://admin:root123@localhost:5433/quizis_db" \
 *      backend/node_modules/.bin/tsx backend/test/stress/setup.ts
 */
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.DATABASE_URL ?? 'postgresql://admin:root123@localhost:5433/quizis_db';
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const sala = await prisma.salas.findFirst({
    where: {
      estado: { in: ['EN_VIVO', 'ESPERANDO_ALUMNOS', 'BORRADOR'] },
      deletedAt: null,
    },
    include: {
      rondas: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!sala) {
    console.error('ERROR: No hay salas disponibles. Crea una desde el frontend primero.');
    process.exit(1);
  }

  const ronda = sala.rondas[0];

  if (!ronda) {
    console.error('ERROR: La sala no tiene rondas. Inicia una partida desde el frontend.');
    process.exit(1);
  }

  // Obtener una pregunta del banco de la sala
  const pregunta = await prisma.preguntas.findFirst({
    where: { bancoId: sala.bancoId },
    include: { opciones: true },
  });

  if (!pregunta) {
    console.error('ERROR: No hay preguntas en el banco de la sala.');
    process.exit(1);
  }

  console.log('\n=== VALORES PARA vote-stress.yml y vote-concurrent.yml ===\n');
  console.log(`TOKEN_SALA:   "${sala.tokenCompartido}"`);
  console.log(`SALA_ID:       ${sala.salaId}`);
  console.log(`RONDA_ID:      ${ronda.rondaId}`);
  console.log(`PREGUNTA_ID:   ${pregunta.preguntaId}`);
  console.log(`OPCION_IDS:    ${pregunta.opciones.map((o) => o.opcionId).join(', ')}`);
  console.log('\nIMPORTANTE: Libera la pregunta desde el frontend antes de correr el test.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
