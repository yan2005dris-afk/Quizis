import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedSalaDemo = async (
  prisma: PrismaClient,
  adminId: number,
) => {

  // ── Buscar comodines ──
  const comodines = await prisma.comodines.findMany();
  if (comodines.length === 0) throw new Error('Comodines no encontrados. Ejecutá primero el seed de comodines.');

  // ── Crear banco de preguntas ──
  const banco = await prisma.bancoPreguntas.create({
    data: {
      nombre: 'Cultura General',
      descripcion: 'Preguntas de cultura general variadas',
      usuarioId: adminId,
    },
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
    // ── Pregunta con 8 opciones ──
    {
      texto: '¿Qué país NO forma parte del sudeste asiático?',
      categoria: 'Geografía',
      nivel: 3,
      monto: 5000,
      feedbackCorrecto: '¡Correcto! La India pertenece al sur de Asia, no al sudeste asiático.',
      feedbackIncorrecto: 'Incorrecto. India está en el sur de Asia, no en el sudeste asiático.',
      opciones: [
        { texto: 'Tailandia', esCorrecta: false },
        { texto: 'Vietnam', esCorrecta: false },
        { texto: 'India', esCorrecta: true },
        { texto: 'Malasia', esCorrecta: false },
        { texto: 'Indonesia', esCorrecta: false },
        { texto: 'Filipinas', esCorrecta: false },
        { texto: 'Singapur', esCorrecta: false },
        { texto: 'Camboya', esCorrecta: false },
      ],
    },
    // ── Pregunta con 10 opciones ──
    {
      texto: '¿Cuál de los siguientes NO es un hueso del cuerpo humano?',
      categoria: 'Ciencia',
      nivel: 3,
      monto: 8000,
      feedbackCorrecto: '¡Claro! El bíceps es un músculo, no un hueso.',
      feedbackIncorrecto: 'No es correcto. El bíceps es un músculo del brazo.',
      opciones: [
        { texto: 'Fémur', esCorrecta: false },
        { texto: 'Bíceps', esCorrecta: true },
        { texto: 'Húmero', esCorrecta: false },
        { texto: 'Tibia', esCorrecta: false },
        { texto: 'Cráneo', esCorrecta: false },
        { texto: 'Tríceps', esCorrecta: false },
        { texto: 'Costilla', esCorrecta: false },
        { texto: 'Omóplato', esCorrecta: false },
        { texto: 'Clavícula', esCorrecta: false },
        { texto: 'Peroné', esCorrecta: false },
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
      adminId,
      bancoId: banco.bancoId,
      nombre: 'Gran Torneo de Cultura General - Edición 2024',
      estado: 'EN_VIVO',
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
      create: { salaId: sala.salaId, nickname: p.nickname, rol: p.rol },
    });
  }

  // ── Ronda activa para la sala ──
  const estudiante = await prisma.participantes.findFirst({
    where: { salaId: sala.salaId, rol: 'estudiante' },
  });

  if (estudiante) {
    const preguntasIDs = preguntasCreadas.map((p) => p.preguntaId);
    await prisma.rondas.create({
      data: {
        salaId: sala.salaId,
        participanteId: estudiante.participanteId,
        numeroRonda: 1,
        estado: 'jugando',
        fechaInicio: new Date(),
        preguntasAsignadas: preguntasIDs,
        preguntaActualId: preguntasIDs[0], // Seteamos la primera pregunta como activa
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
