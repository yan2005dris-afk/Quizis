import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedSalas = async (prisma: PrismaClient) => {
  // 1. Obtener al admin y al banco creados previamente
  const admin = await prisma.usuarios.findFirst({
    where: { email: 'admin@quizis.com' },
  });

  const banco = await prisma.bancoPreguntas.findFirst({
    where: { nombre: 'Banco de Prueba General' },
  });

  if (!admin || !banco) {
    throw new Error(
      'Falta el admin o el banco para crear la sala de prueba',
    );
  }

  // 2. Crear una Sala de Prueba
  const sala = await prisma.salas.upsert({
    where: { pin: 'UPSE-1234' },
    update: {},
    create: {
      adminId: admin.usuarioId,
      bancoId: banco.bancoId,
      nombre: 'Sala de Test UPSE (Seed)',
      limitePreguntas: 5,
      estado: 'borrador',
      pin: 'UPSE-1234',
    },
  });

  return sala;
};
