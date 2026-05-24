import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedParticipantes = async (prisma: PrismaClient) => {
  // Obtenemos la sala de prueba
  const sala = await prisma.salas.findFirst({
    where: { pin: 'UPSE-1234' },
  });

  if (!sala) {
    throw new Error('Falta la sala para poder crear el participante');
  }

  // Crear un Participante de Prueba
  await prisma.participantes.upsert({
    where: {
      salaId_nickname: {
        salaId: sala.salaId,
        nickname: 'Damian_Student',
      },
    },
    update: {},
    create: {
      salaId: sala.salaId,
      nickname: 'Damian_Student',
      rol: 'estudiante',
      isOnline: true,
    },
  });
};
