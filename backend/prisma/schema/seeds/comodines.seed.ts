import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedComodines = async (prisma: PrismaClient) => {
  const comodines = [
    { nombre: 'PUBLICO', descripcion: 'Votación de los observadores' },
    { nombre: 'IA', descripcion: 'Sugerencia de inteligencia artificial' },
    { nombre: 'LLAMADA', descripcion: 'Ayuda de un participante elegido' },
  ];

  const createdComodines: any[] = [];
  for (const c of comodines) {
    const created = await prisma.comodines.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
    createdComodines.push(created);
  }

  return createdComodines;
};
