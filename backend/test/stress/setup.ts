/**
 * setup.ts — Obtiene IDs reales de DB para los archivos de stress test.
 * Uso: npx ts-node backend/test/stress/setup.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sala = await prisma.salas.findFirst({
    where: { habilitada: true },
    include: {
      rondas: {
        include: {
          preguntas: {
            include: { opciones: true },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  if (!sala) {
    console.error('ERROR: No hay salas habilitadas. Crea una desde el frontend primero.');
    process.exit(1);
  }

  const ronda = sala.rondas[0];
  const pregunta = ronda?.preguntas[0];

  if (!ronda || !pregunta) {
    console.error('ERROR: La sala no tiene rondas o preguntas configuradas.');
    process.exit(1);
  }

  console.log('\n=== VALORES PARA vote-stress.yml y vote-concurrent.yml ===\n');
  console.log(`TOKEN_SALA:   "${sala.tokenCompartido}"`);
  console.log(`SALA_ID:       ${sala.salaId}`);
  console.log(`RONDA_ID:      ${ronda.rondaId}`);
  console.log(`PREGUNTA_ID:   ${pregunta.preguntaId}`);
  console.log(`OPCION_IDS:    ${pregunta.opciones.map((o: any) => o.opcionId).join(', ')}`);
  console.log('\nIMPORTANTE: Libera la pregunta desde el frontend antes de correr el test.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
