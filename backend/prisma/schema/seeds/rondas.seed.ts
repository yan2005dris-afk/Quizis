import { PrismaClient } from '../../../src/generated/prisma/client';

/**
 * Seed para el módulo de Rondas.
 *
 * Crea una sala de prueba, registra participantes (estudiante y observador)
 * y genera una ronda de juego activa para que pueda ser testeada
 * directamente desde clientes HTTP/WebSocket (ej: Insomnia).
 */
export const seedRondas = async (prisma: PrismaClient) => {
  // 1. Obtener el usuario administrador (profesor)
  const admin = await prisma.usuarios.findFirst({
    where: { email: 'admin@quizis.com' },
  });

  if (!admin) {
    throw new Error('Usuario admin@quizis.com no encontrado para el seed de rondas');
  }

  // 2. Obtener el banco de preguntas de Cultura General y sus preguntas
  const banco = await prisma.bancoPreguntas.findFirst({
    where: { nombre: 'Cultura General' },
    include: { preguntas: true },
  });

  if (!banco || banco.preguntas.length === 0) {
    throw new Error('Banco "Cultura General" o sus preguntas no encontrados para el seed de rondas');
  }

  // Tomamos los primeros 5 IDs de preguntas para asignárselas a la ronda
  const preguntaIds = banco.preguntas.slice(0, 5).map((p) => p.preguntaId);

  // 3. Crear una sala activa de prueba con tokenCompartido (UUID) fijo para facilitar el testeo
  const sala = await prisma.salas.create({
    data: {
      adminId: admin.usuarioId,
      bancoId: banco.bancoId,
      nombre: 'Sala de Demostración de Rondas',
      tokenCompartido: 'de9b23b3-8b77-4f6c-8438-e6b8a8b11111',
      estado: 'ESPERANDO_ALUMNOS',
      limitePreguntas: 5,
    },
  });

  // 4. Crear un participante (estudiante) en la sala
  const estudiante = await prisma.participantes.create({
    data: {
      salaId: sala.salaId,
      nickname: 'DamianEstudiante',
      rol: 'estudiante',
    },
  });

  // 5. Crear un participante (observador) en la sala
  await prisma.participantes.create({
    data: {
      salaId: sala.salaId,
      nickname: 'ProfesorObservador',
      rol: 'observador',
    },
  });

  // 6. Crear una ronda activa para el estudiante en estado 'jugando'
  await prisma.rondas.create({
    data: {
      salaId: sala.salaId,
      participanteId: estudiante.participanteId,
      numeroRonda: 1,
      estado: 'jugando',
      preguntasAsignadas: preguntaIds,
      fechaInicio: new Date(),
    },
  });
};
