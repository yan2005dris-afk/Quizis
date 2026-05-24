import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedPreguntas = async (prisma: PrismaClient) => {
  // 1. Crear Banco 1: Cultura General
  const bancoCultura = await prisma.bancoPreguntas.create({
    data: {
      nombre: 'Cultura General',
      descripcion: 'Preguntas variadas sobre geografía, historia y arte.',
    },
  });

  // Generamos 20 preguntas para el Banco 1
  for (let i = 1; i <= 20; i++) {
    await prisma.preguntas.create({
      data: {
        bancoId: bancoCultura.bancoId,
        texto: `Pregunta de Cultura General Nº ${i}: ¿Cuál es el océano más grande del mundo?`,
        categoria: 'Geografía',
        nivel: 1,
        opciones: {
          create: [
            { texto: 'Pacífico', esCorrecta: true },
            { texto: 'Atlántico', esCorrecta: false },
            { texto: 'Índico', esCorrecta: false },
            { texto: 'Ártico', esCorrecta: false },
          ],
        },
      },
    });
  }

  // 2. Crear Banco 2: Matemáticas
  const bancoMatematicas = await prisma.bancoPreguntas.create({
    data: {
      nombre: 'Matemáticas',
      descripcion: 'Preguntas de aritmética, álgebra y lógica.',
    },
  });

  // Generamos 16 preguntas para el Banco 2
  for (let i = 1; i <= 16; i++) {
    await prisma.preguntas.create({
      data: {
        bancoId: bancoMatematicas.bancoId,
        texto: `Pregunta de Matemáticas Nº ${i}: ¿Cuánto es 7 x 8?`,
        categoria: 'Aritmética',
        nivel: 2,
        opciones: {
          create: [
            { texto: '56', esCorrecta: true },
            { texto: '54', esCorrecta: false },
            { texto: '64', esCorrecta: false },
            { texto: '48', esCorrecta: false },
          ],
        },
      },
    });
  }
};
