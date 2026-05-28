import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedBancosAdicionales = async (
  prisma: PrismaClient,
  usuarioId: number,
) => {
  const bancosData = [
    {
      nombre: 'Tecnología y Programación',
      descripcion: 'Desafía tus conocimientos en el mundo del desarrollo de software y hardware.',
      preguntas: [
        {
          texto: '¿Qué significa la sigla HTML?',
          categoria: 'Web',
          nivel: 1,
          monto: 500,
          feedbackCorrecto: 'HyperText Markup Language es el estándar para crear páginas web.',
          feedbackIncorrecto: 'Incorrecto. Es HyperText Markup Language.',
          opciones: [
            { texto: 'HyperText Markup Language', esCorrecta: true },
            { texto: 'High Tech Modern Language', esCorrecta: false },
            { texto: 'Hyperlinks and Text Management', esCorrecta: false },
            { texto: 'Home Tool Markup Language', esCorrecta: false },
          ],
        },
        {
          texto: '¿Cuál de estos NO es un framework de JavaScript?',
          categoria: 'Software',
          nivel: 1,
          monto: 1000,
          feedbackCorrecto: 'Django es un framework de Python, no de JavaScript.',
          feedbackIncorrecto: 'Incorrecto. Django es de Python.',
          opciones: [
            { texto: 'Angular', esCorrecta: false },
            { texto: 'React', esCorrecta: false },
            { texto: 'Django', esCorrecta: true },
            { texto: 'Vue', esCorrecta: false },
          ],
        },
        {
          texto: '¿Quién es considerado el creador de Linux?',
          categoria: 'Sistemas Operativos',
          nivel: 2,
          monto: 2500,
          feedbackCorrecto: 'Linus Torvalds inició el kernel de Linux en 1991.',
          feedbackIncorrecto: 'Fue Linus Torvalds.',
          opciones: [
            { texto: 'Bill Gates', esCorrecta: false },
            { texto: 'Steve Jobs', esCorrecta: false },
            { texto: 'Linus Torvalds', esCorrecta: true },
            { texto: 'Mark Zuckerberg', esCorrecta: false },
          ],
        },
      ],
    },
    {
      nombre: 'Historia del Arte',
      descripcion: 'Un recorrido por las obras y artistas más influyentes de la historia.',
      preguntas: [
        {
          texto: '¿Quién pintó la "Mona Lisa"?',
          categoria: 'Renacimiento',
          nivel: 1,
          monto: 1000,
          feedbackCorrecto: 'Leonardo da Vinci la pintó entre 1503 y 1506.',
          feedbackIncorrecto: 'Incorrecto. Fue Leonardo da Vinci.',
          opciones: [
            { texto: 'Miguel Ángel', esCorrecta: false },
            { texto: 'Leonardo da Vinci', esCorrecta: true },
            { texto: 'Rafael', esCorrecta: false },
            { texto: 'Donatello', esCorrecta: false },
          ],
        },
        {
          texto: '¿A qué movimiento artístico pertenecía Vincent van Gogh?',
          categoria: 'Pintura',
          nivel: 2,
          monto: 3000,
          feedbackCorrecto: 'Van Gogh fue uno de los principales exponentes del Postimpresionismo.',
          feedbackIncorrecto: 'Pertenece al Postimpresionismo.',
          opciones: [
            { texto: 'Impresionismo', esCorrecta: false },
            { texto: 'Cubismo', esCorrecta: false },
            { texto: 'Postimpresionismo', esCorrecta: true },
            { texto: 'Surrealismo', esCorrecta: false },
          ],
        },
      ],
    },
    {
      nombre: 'Cine y Series',
      descripcion: 'Para los amantes de la pantalla grande y el streaming.',
      preguntas: [
        {
          texto: '¿Cuál es la película más taquillera de la historia (sin ajustar por inflación)?',
          categoria: 'Cine',
          nivel: 2,
          monto: 2000,
          feedbackCorrecto: 'Avatar (2009) mantiene el primer puesto.',
          feedbackIncorrecto: 'Es Avatar.',
          opciones: [
            { texto: 'Titanic', esCorrecta: false },
            { texto: 'Avengers: Endgame', esCorrecta: false },
            { texto: 'Avatar', esCorrecta: true },
            { texto: 'Star Wars: A New Hope', esCorrecta: false },
          ],
        },
        {
          texto: '¿Cómo se llama el reino ficticio donde se desarrolla "Game of Thrones"?',
          categoria: 'Series',
          nivel: 1,
          monto: 500,
          feedbackCorrecto: 'Westeros (Poniente) es el continente principal.',
          feedbackIncorrecto: 'Es Westeros.',
          opciones: [
            { texto: 'Hogwarts', esCorrecta: false },
            { texto: 'Westeros', esCorrecta: true },
            { texto: 'Narnia', esCorrecta: false },
            { texto: 'Middle Earth', esCorrecta: false },
          ],
        },
      ],
    }
  ];

  for (const b of bancosData) {
    const { preguntas, ...bancoData } = b;
    const nuevoBanco = await prisma.bancoPreguntas.create({
      data: {
        nombre: bancoData.nombre,
        descripcion: bancoData.descripcion,
        usuarioId,
      },
    });

    for (const p of preguntas) {
      const { opciones, ...preguntaData } = p;
      await prisma.preguntas.create({
        data: {
          bancoId: nuevoBanco.bancoId,
          texto: preguntaData.texto,
          categoria: preguntaData.categoria,
          nivel: preguntaData.nivel,
          monto: preguntaData.monto,
          feedbackCorrecto: preguntaData.feedbackCorrecto,
          feedbackIncorrecto: preguntaData.feedbackIncorrecto,
          opciones: {
            create: opciones.map((o) => ({
              texto: o.texto,
              esCorrecta: o.esCorrecta,
            })),
          },
        },
      });
    }
  }

  console.log(`   📚 Bancos adicionales creados: ${bancosData.length}`);
};
