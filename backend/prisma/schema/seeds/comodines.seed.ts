import { PrismaClient } from '../../../src/generated/prisma/client';

export interface ComodinSeed {
  nombre: string;
  descripcion: string;
  icono: string;
}

export const COMODINES: ComodinSeed[] = [
  { nombre: 'PUBLICO', descripcion: 'Votación de los observadores', icono: '👥' },
  { nombre: 'IA', descripcion: 'Sugerencia de inteligencia artificial', icono: '🤖' },
  { nombre: 'LLAMADA', descripcion: 'Ayuda de un participante elegido', icono: '📞' },
  { nombre: '50_50', descripcion: 'Elimina dos opciones incorrectas', icono: '✂️' },
  { nombre: 'SALTA_OPCION', descripcion: 'Salta esta pregunta sin penalización', icono: '⏭️' },
  { nombre: 'TIEMPO_EXTRA', descripcion: 'Agrega 30 segundos al temporizador', icono: '⏱️' },
];

export const seedComodines = async (prisma: PrismaClient) => {
  const createdComodines: any[] = [];
  for (const c of COMODINES) {
    const created = await prisma.comodines.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
    createdComodines.push(created);
  }

  return createdComodines;
};
