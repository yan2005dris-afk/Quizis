import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedBancos = async (prisma: PrismaClient) => {
  // Creamos el banco de preguntas
  const banco = await prisma.bancoPreguntas.upsert({
    where: { bancoId: 1 },
    update: {},
    create: {
      nombre: 'Banco de Prueba General',
      descripcion: 'Banco inicial con preguntas de cultura general',
    },
  });

  // Lista de preguntas de prueba
  const preguntasData = [
    {
      texto: '¿Cuál es la capital de Francia?',
      nivel: 1,
      opciones: {
        create: [
          { texto: 'Madrid', esCorrecta: false },
          { texto: 'París', esCorrecta: true },
          { texto: 'Roma', esCorrecta: false },
          { texto: 'Londres', esCorrecta: false },
        ],
      },
    },
    {
      texto: '¿Quién escribió "Cien años de soledad"?',
      nivel: 2,
      opciones: {
        create: [
          { texto: 'Gabriel García Márquez', esCorrecta: true },
          { texto: 'Mario Vargas Llosa', esCorrecta: false },
          { texto: 'Pablo Neruda', esCorrecta: false },
          { texto: 'Julio Cortázar', esCorrecta: false },
        ],
      },
    },
    {
      texto: '¿Cuál es el planeta más grande del sistema solar?',
      nivel: 1,
      opciones: {
        create: [
          { texto: 'Marte', esCorrecta: false },
          { texto: 'Tierra', esCorrecta: false },
          { texto: 'Júpiter', esCorrecta: true },
          { texto: 'Saturno', esCorrecta: false },
        ],
      },
    },
    {
      texto: '¿En qué año llegó el hombre a la luna?',
      nivel: 3,
      opciones: {
        create: [
          { texto: '1965', esCorrecta: false },
          { texto: '1969', esCorrecta: true },
          { texto: '1971', esCorrecta: false },
          { texto: '1967', esCorrecta: false },
        ],
      },
    },
    {
      texto: '¿Cuál es el océano más grande del mundo?',
      nivel: 1,
      opciones: {
        create: [
          { texto: 'Océano Atlántico', esCorrecta: false },
          { texto: 'Océano Índico', esCorrecta: false },
          { texto: 'Océano Ártico', esCorrecta: false },
          { texto: 'Océano Pacífico', esCorrecta: true },
        ],
      },
    },
  ];

  // Insertamos las preguntas relacionadas al banco si no existen
  const preguntasCount = await prisma.preguntas.count({
    where: { bancoId: banco.bancoId },
  });

  if (preguntasCount === 0) {
    for (const pregunta of preguntasData) {
      await prisma.preguntas.create({
        data: {
          bancoId: banco.bancoId,
          texto: pregunta.texto,
          nivel: pregunta.nivel,
          opciones: pregunta.opciones,
        },
      });
    }
  }

  return banco;
};
