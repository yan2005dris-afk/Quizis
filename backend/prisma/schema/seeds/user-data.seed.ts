import { PrismaClient } from '../../../src/generated/prisma/client';
import { seedBancosAdicionales } from './bancos-adicionales.seed';

/**
 * Seed: Distribuye datos específicos por usuario.
 *
 * Crea bancos de preguntas para cada usuario registrado y una sala demo
 * para el admin principal.
 */
export const seedUserData = async (prisma: PrismaClient) => {
  const usuarios = await prisma.usuarios.findMany();
  if (usuarios.length === 0) {
    throw new Error('No hay usuarios registrados para asignar datos.');
  }

  const admin = usuarios.find((u) => u.email === 'admin@quizis.com');
  const yandris = usuarios.find((u) => u.email === 'yandris@quizis.com');
  const andy = usuarios.find((u) => u.email === 'andy@quizis.com');
  const said = usuarios.find((u) => u.email === 'said@quizis.com');
  const diana = usuarios.find((u) => u.email === 'diana@quizis.com');
  const allison = usuarios.find((u) => u.email === 'allison@quizis.com');
  const gino = usuarios.find((u) => u.email === 'gino@quizis.com');
  const angel = usuarios.find((u) => u.email === 'angel@quizis.com');

  // ── Admin: Tecnología y Programación ──
  if (admin) {
    await seedBancosAdicionales(prisma, admin.usuarioId);
  }

  // ── Yandris: Historia del Arte ──
  if (yandris) {
    // Create a small bank for yandris
    const bancoArte = await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Historia del Arte',
        descripcion: 'Un recorrido por las obras y artistas más influyentes de la historia.',
        usuarioId: yandris.usuarioId,
      },
    });

    const preguntasArte = [
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
    ];

    for (const p of preguntasArte) {
      await prisma.preguntas.create({
        data: {
          bancoId: bancoArte.bancoId,
          texto: p.texto,
          categoria: p.categoria,
          nivel: p.nivel,
          monto: p.monto,
          feedbackCorrecto: p.feedbackCorrecto,
          feedbackIncorrecto: p.feedbackIncorrecto,
          opciones: {
            create: p.opciones.map((o) => ({
              texto: o.texto,
              esCorrecta: o.esCorrecta,
            })),
          },
        },
      });
    }
  }

  // ── Andy: Cine y Series ──
  if (andy) {
    const bancoCine = await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Cine y Series',
        descripcion: 'Para los amantes de la pantalla grande y el streaming.',
        usuarioId: andy.usuarioId,
      },
    });

    const preguntasCine = [
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
    ];

    for (const p of preguntasCine) {
      await prisma.preguntas.create({
        data: {
          bancoId: bancoCine.bancoId,
          texto: p.texto,
          categoria: p.categoria,
          nivel: p.nivel,
          monto: p.monto,
          feedbackCorrecto: p.feedbackCorrecto,
          feedbackIncorrecto: p.feedbackIncorrecto,
          opciones: {
            create: p.opciones.map((o) => ({
              texto: o.texto,
              esCorrecta: o.esCorrecta,
            })),
          },
        },
      });
    }
  }

  // ── Said: Ciencias ──
  if (said) {
    await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Ciencias Naturales',
        descripcion: 'Biología, química y física para mentes curiosas.',
        usuarioId: said.usuarioId,
      },
    });
  }

  // ── Diana: Geografía ──
  if (diana) {
    await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Geografía Mundial',
        descripcion: 'Capitales, ríos, montañas y más.',
        usuarioId: diana.usuarioId,
      },
    });
  }

  // ── Allison: Literatura ──
  if (allison) {
    await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Literatura Universal',
        descripcion: 'Autores, obras y corrientes literarias.',
        usuarioId: allison.usuarioId,
      },
    });
  }

  // ── Gino: Deportes ──
  if (gino) {
    await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Deportes',
        descripcion: 'Fútbol, básquet, tenis y más disciplinas.',
        usuarioId: gino.usuarioId,
      },
    });
  }

  // ── Angel: Historia ──
  if (angel) {
    await prisma.bancoPreguntas.create({
      data: {
        nombre: 'Historia Universal',
        descripcion: 'Eventos, personajes y civilizaciones que marcaron la humanidad.',
        usuarioId: angel.usuarioId,
      },
    });
  }

  // Count total banks created per user for reporting
  const totalUsersWithData = usuarios.filter((u) => u.email !== 'pachay@quizis.com' && u.email !== 'anthony@quizis.com').length;
  console.log(`   👤 Datos de usuario distribuidos en ${totalUsersWithData} usuarios`);
};
