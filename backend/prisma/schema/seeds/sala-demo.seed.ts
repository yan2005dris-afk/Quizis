import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedSalaDemo = async (prisma: PrismaClient) => {
  // ── Buscar admin ──
  const admin = await prisma.usuarios.findUnique({ where: { email: 'admin@quizis.com' } });
  if (!admin) throw new Error('Admin no encontrado. Ejecutá primero el seed de usuarios.');

  // ── Buscar comodines ──
  const comodines = await prisma.comodines.findMany();
  if (comodines.length === 0) throw new Error('Comodines no encontrados. Ejecutá primero el seed de comodines.');

  // ── Crear banco de preguntas ──
  const banco = await prisma.bancoPreguntas.create({
    data: { nombre: 'Cultura General', descripcion: 'Preguntas de cultura general variadas' },
  });

  // ── Preguntas con opciones ──
  const preguntasData = [
    {
      texto: '¿Cuál es la capital de Ecuador?',
      categoria: 'Geografía',
      nivel: 1,
      monto: 1000,
      feedbackCorrecto: '¡Correcto! Quito es la capital de Ecuador.',
      feedbackIncorrecto: 'Incorrecto. La capital de Ecuador es Quito.',
      opciones: [
        { texto: 'Quito', esCorrecta: true },
        { texto: 'Lima', esCorrecta: false },
        { texto: 'Bogotá', esCorrecta: false },
        { texto: 'Caracas', esCorrecta: false },
      ],
    },
    {
      texto: '¿En qué año llegó el hombre a la luna?',
      categoria: 'Ciencia',
      nivel: 1,
      monto: 1500,
      feedbackCorrecto: '¡Exacto! El Apolo 11 aterrizó en la luna en 1969.',
      feedbackIncorrecto: 'No es correcto. Fue en 1969.',
      opciones: [
        { texto: '1965', esCorrecta: false },
        { texto: '1969', esCorrecta: true },
        { texto: '1972', esCorrecta: false },
        { texto: '1961', esCorrecta: false },
      ],
    },
    {
      texto: '¿Quién escribió "Cien años de soledad"?',
      categoria: 'Literatura',
      nivel: 1,
      monto: 2000,
      feedbackCorrecto: '¡Muy bien! Gabriel García Márquez, premio Nobel de literatura.',
      feedbackIncorrecto: 'Incorrecto. Fue Gabriel García Márquez.',
      opciones: [
        { texto: 'Mario Vargas Llosa', esCorrecta: false },
        { texto: 'Julio Cortázar', esCorrecta: false },
        { texto: 'Gabriel García Márquez', esCorrecta: true },
        { texto: 'Pablo Neruda', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el río más largo del mundo?',
      categoria: 'Geografía',
      nivel: 2,
      monto: 3000,
      feedbackCorrecto: '¡Correcto! El Amazonas es el río más largo.',
      feedbackIncorrecto: 'No. El río más largo es el Amazonas.',
      opciones: [
        { texto: 'Nilo', esCorrecta: false },
        { texto: 'Amazonas', esCorrecta: true },
        { texto: 'Misisipi', esCorrecta: false },
        { texto: 'Yangtsé', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el planeta más grande del sistema solar?',
      categoria: 'Ciencia',
      nivel: 2,
      monto: 2500,
      feedbackCorrecto: '¡Así es! Júpiter es el planeta más grande.',
      feedbackIncorrecto: 'Incorrecto. Júpiter es el más grande.',
      opciones: [
        { texto: 'Saturno', esCorrecta: false },
        { texto: 'Júpiter', esCorrecta: true },
        { texto: 'Neptuno', esCorrecta: false },
        { texto: 'Urano', esCorrecta: false },
      ],
    },
  ];

  const preguntasCreadas: any[] = [];
  for (const p of preguntasData) {
    const { opciones, ...preguntaData } = p;
    const pregunta = await prisma.preguntas.create({
      data: {
        bancoId: banco.bancoId,
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
      include: { opciones: true },
    });
    preguntasCreadas.push(pregunta);
  }

  // ── Crear sala demo ──
  const sala = await prisma.salas.create({
    data: {
      adminId: admin.usuarioId,
      bancoId: banco.bancoId,
      nombre: 'Gran Torneo de Cultura General - Edición 2024',
      estado: 'jugando',
      limitePreguntas: 15,
      comodines: {
        create: comodines.map((c) => ({ comodinId: c.comodinId, activo: true })),
      },
    },
  });

  // ── Participantes ──
  const participantesData = [
    { nickname: 'SofiaM', rol: 'estudiante' },
    { nickname: 'CarlosL', rol: 'observador' },
    { nickname: 'MartinaG', rol: 'observador' },
    { nickname: 'JorgeP', rol: 'observador' },
    { nickname: 'LuciaF', rol: 'estudiante' },
    { nickname: 'DiegoR', rol: 'observador' },
  ];

  for (const p of participantesData) {
    await prisma.participantes.upsert({
      where: { salaId_nickname: { salaId: sala.salaId, nickname: p.nickname } },
      update: {},
      create: { salaId: sala.salaId, nickname: p.nickname, rol: p.rol, isOnline: true },
    });
  }

  // ── Ronda activa para la sala ──
  const estudiante = await prisma.participantes.findFirst({
    where: { salaId: sala.salaId, rol: 'estudiante', isOnline: true },
  });

  if (estudiante) {
    await prisma.rondas.create({
      data: {
        salaId: sala.salaId,
        participanteId: estudiante.participanteId,
        numeroRonda: 1,
        estado: 'jugando',
        fechaInicio: new Date(),
        preguntasAsignadas: preguntasCreadas.slice(0, 5).map((p) => p.preguntaId),
      },
    });
  }

  console.log(`   🆔 Sala ID: ${sala.salaId}`);
  console.log(`   🔗 Token compartido: ${sala.tokenCompartido}`);
  console.log(`   📝 Preguntas creadas: ${preguntasCreadas.length}`);
  console.log(`   👥 Participantes: ${participantesData.length}`);
  console.log(`   🏆 Ronda activa: Sí`);

  return sala;
};
