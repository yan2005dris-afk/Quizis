import { PrismaClient } from '../../../src/generated/prisma/client';

export const seedPreguntas = async (prisma: PrismaClient, adminUserId: number) => {
  // 1. Crear Banco 1: Cultura General
  const bancoCultura = await prisma.bancoPreguntas.create({
    data: {
      nombre: 'Cultura General',
      descripcion: 'Preguntas variadas sobre geografía, historia, ciencia y arte.',
      usuarioId: adminUserId,
    },
  });

  const preguntasCultura = [
    {
      texto: '¿Cuál es el océano más grande del mundo?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Pacífico', esCorrecta: true },
        { texto: 'Atlántico', esCorrecta: false },
        { texto: 'Índico', esCorrecta: false },
        { texto: 'Ártico', esCorrecta: false },
      ],
    },
    {
      texto: '¿Quién pintó "La noche estrellada"?',
      categoria: 'Arte',
      opciones: [
        { texto: 'Vincent van Gogh', esCorrecta: true },
        { texto: 'Pablo Picasso', esCorrecta: false },
        { texto: 'Leonardo da Vinci', esCorrecta: false },
        { texto: 'Claude Monet', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el país más grande del mundo por superficie?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Rusia', esCorrecta: true },
        { texto: 'Canadá', esCorrecta: false },
        { texto: 'China', esCorrecta: false },
        { texto: 'Estados Unidos', esCorrecta: false },
      ],
    },
    {
      texto: '¿En qué año llegó el hombre a la Luna por primera vez?',
      categoria: 'Historia',
      opciones: [
        { texto: '1969', esCorrecta: true },
        { texto: '1961', esCorrecta: false },
        { texto: '1975', esCorrecta: false },
        { texto: '1958', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es la capital de Italia?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Roma', esCorrecta: true },
        { texto: 'Milán', esCorrecta: false },
        { texto: 'Venecia', esCorrecta: false },
        { texto: 'Nápoles', esCorrecta: false },
      ],
    },
    {
      texto: '¿Quién escribió "Don Quijote de la Mancha"?',
      categoria: 'Literatura',
      opciones: [
        { texto: 'Miguel de Cervantes', esCorrecta: true },
        { texto: 'Gabriel García Márquez', esCorrecta: false },
        { texto: 'Federico García Lorca', esCorrecta: false },
        { texto: 'Lope de Vega', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el elemento químico con el símbolo "O"?',
      categoria: 'Ciencia',
      opciones: [
        { texto: 'Oxígeno', esCorrecta: true },
        { texto: 'Oro', esCorrecta: false },
        { texto: 'Osmio', esCorrecta: false },
        { texto: 'Oganesón', esCorrecta: false },
      ],
    },
    {
      texto: '¿Qué planeta es conocido como el "Planeta Rojo"?',
      categoria: 'Ciencia',
      opciones: [
        { texto: 'Marte', esCorrecta: true },
        { texto: 'Júpiter', esCorrecta: false },
        { texto: 'Venus', esCorrecta: false },
        { texto: 'Saturno', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el río más largo del mundo?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Amazonas', esCorrecta: true },
        { texto: 'Nilo', esCorrecta: false },
        { texto: 'Misisipi', esCorrecta: false },
        { texto: 'Yangtsé', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es la montaña más alta del mundo sobre el nivel del mar?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Everest', esCorrecta: true },
        { texto: 'K2', esCorrecta: false },
        { texto: 'Kangchenjunga', esCorrecta: false },
        { texto: 'Aconcagua', esCorrecta: false },
      ],
    },
    {
      texto: '¿A qué país pertenecen las Islas Galápagos?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'Ecuador', esCorrecta: true },
        { texto: 'Chile', esCorrecta: false },
        { texto: 'Perú', esCorrecta: false },
        { texto: 'Colombia', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es la moneda oficial de Japón?',
      categoria: 'Economía',
      opciones: [
        { texto: 'Yen', esCorrecta: true },
        { texto: 'Yuan', esCorrecta: false },
        { texto: 'Won', esCorrecta: false },
        { texto: 'Dólar', esCorrecta: false },
      ],
    },
    {
      texto: '¿Quién inventó la bombilla eléctrica?',
      categoria: 'Ciencia',
      opciones: [
        { texto: 'Thomas Edison', esCorrecta: true },
        { texto: 'Nikola Tesla', esCorrecta: false },
        { texto: 'Alexander Graham Bell', esCorrecta: false },
        { texto: 'Benjamin Franklin', esCorrecta: false },
      ],
    },
    {
      texto: '¿En qué continente se encuentra el Desierto del Sahara?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'África', esCorrecta: true },
        { texto: 'Asia', esCorrecta: false },
        { texto: 'Oceanía', esCorrecta: false },
        { texto: 'América', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el hueso más largo del cuerpo humano?',
      categoria: 'Ciencia',
      opciones: [
        { texto: 'Fémur', esCorrecta: true },
        { texto: 'Húmero', esCorrecta: false },
        { texto: 'Tibia', esCorrecta: false },
        { texto: 'Radio', esCorrecta: false },
      ],
    },
    {
      texto: '¿Qué país ganó la primera Copa del Mundo de fútbol en 1930?',
      categoria: 'Deportes',
      opciones: [
        { texto: 'Uruguay', esCorrecta: true },
        { texto: 'Argentina', esCorrecta: false },
        { texto: 'Brasil', esCorrecta: false },
        { texto: 'Alemania', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cómo se llama el proceso por el cual las plantas fabrican su alimento?',
      categoria: 'Ciencia',
      opciones: [
        { texto: 'Fotosíntesis', esCorrecta: true },
        { texto: 'Respiración', esCorrecta: false },
        { texto: 'Transpiración', esCorrecta: false },
        { texto: 'Combustión', esCorrecta: false },
      ],
    },
    {
      texto: '¿Quién fue el primer presidente de los Estados Unidos?',
      categoria: 'Historia',
      opciones: [
        { texto: 'George Washington', esCorrecta: true },
        { texto: 'Abraham Lincoln', esCorrecta: false },
        { texto: 'Thomas Jefferson', esCorrecta: false },
        { texto: 'John Adams', esCorrecta: false },
      ],
    },
    {
      texto: '¿En qué ciudad se encuentra la Torre Eiffel?',
      categoria: 'Geografía',
      opciones: [
        { texto: 'París', esCorrecta: true },
        { texto: 'Londres', esCorrecta: false },
        { texto: 'Berlín', esCorrecta: false },
        { texto: 'Madrid', esCorrecta: false },
      ],
    },
    {
      texto: '¿Qué lengua es la más hablada en el mundo como lengua materna?',
      categoria: 'Cultura',
      opciones: [
        { texto: 'Chino mandarín', esCorrecta: true },
        { texto: 'Inglés', esCorrecta: false },
        { texto: 'Español', esCorrecta: false },
        { texto: 'Hindi', esCorrecta: false },
      ],
    },
  ];

  for (const p of preguntasCultura) {
    await prisma.preguntas.create({
      data: {
        bancoId: bancoCultura.bancoId,
        texto: p.texto,
        categoria: p.categoria,
        nivel: 1,
        opciones: {
          create: p.opciones,
        },
      },
    });
  }

  // 2. Crear Banco 2: Matemáticas
  const bancoMatematicas = await prisma.bancoPreguntas.create({
    data: {
      nombre: 'Matemáticas',
      descripcion: 'Preguntas de aritmética, álgebra y lógica.',
      usuarioId: adminUserId,
    },
  });

  const preguntasMatematicas = [
    {
      texto: '¿Cuánto es 7 x 8?',
      opciones: [
        { texto: '56', esCorrecta: true },
        { texto: '54', esCorrecta: false },
        { texto: '64', esCorrecta: false },
        { texto: '48', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es la raíz cuadrada de 144?',
      opciones: [
        { texto: '12', esCorrecta: true },
        { texto: '14', esCorrecta: false },
        { texto: '10', esCorrecta: false },
        { texto: '16', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuánto es el 15% de 200?',
      opciones: [
        { texto: '30', esCorrecta: true },
        { texto: '25', esCorrecta: false },
        { texto: '35', esCorrecta: false },
        { texto: '20', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el valor aproximado de Pi?',
      opciones: [
        { texto: '3.1416', esCorrecta: true },
        { texto: '3.1214', esCorrecta: false },
        { texto: '3.1618', esCorrecta: false },
        { texto: '3.1012', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuántos lados tiene un hexágono?',
      opciones: [
        { texto: '6', esCorrecta: true },
        { texto: '5', esCorrecta: false },
        { texto: '7', esCorrecta: false },
        { texto: '8', esCorrecta: false },
      ],
    },
    {
      texto: '¿Qué número sigue en la secuencia: 2, 4, 8, 16...?',
      opciones: [
        { texto: '32', esCorrecta: true },
        { texto: '24', esCorrecta: false },
        { texto: '64', esCorrecta: false },
        { texto: '30', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuánto es 120 dividido por 4?',
      opciones: [
        { texto: '30', esCorrecta: true },
        { texto: '40', esCorrecta: false },
        { texto: '25', esCorrecta: false },
        { texto: '35', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el resultado de (5 + 3) x 2?',
      opciones: [
        { texto: '16', esCorrecta: true },
        { texto: '13', esCorrecta: false },
        { texto: '21', esCorrecta: false },
        { texto: '11', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuántos grados hay en un ángulo recto?',
      opciones: [
        { texto: '90', esCorrecta: true },
        { texto: '180', esCorrecta: false },
        { texto: '45', esCorrecta: false },
        { texto: '360', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el número primo más pequeño?',
      opciones: [
        { texto: '2', esCorrecta: true },
        { texto: '1', esCorrecta: false },
        { texto: '3', esCorrecta: false },
        { texto: '0', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuánto es 10 al cuadrado?',
      opciones: [
        { texto: '100', esCorrecta: true },
        { texto: '20', esCorrecta: false },
        { texto: '1000', esCorrecta: false },
        { texto: '50', esCorrecta: false },
      ],
    },
    {
      texto: '¿Qué caracteriza a un triángulo equilátero?',
      opciones: [
        { texto: '3 lados iguales', esCorrecta: true },
        { texto: '2 lados iguales', esCorrecta: false },
        { texto: 'Ningún lado igual', esCorrecta: false },
        { texto: 'Un ángulo recto', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuánto es 500 - 125?',
      opciones: [
        { texto: '375', esCorrecta: true },
        { texto: '475', esCorrecta: false },
        { texto: '325', esCorrecta: false },
        { texto: '425', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuál es el resultado de 3 + 2 x 5?',
      opciones: [
        { texto: '13', esCorrecta: true },
        { texto: '25', esCorrecta: false },
        { texto: '15', esCorrecta: false },
        { texto: '10', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cuántos segundos tiene una hora?',
      opciones: [
        { texto: '3600', esCorrecta: true },
        { texto: '60', esCorrecta: false },
        { texto: '360', esCorrecta: false },
        { texto: '1200', esCorrecta: false },
      ],
    },
    {
      texto: '¿Cómo se llama la longitud del contorno de un círculo?',
      opciones: [
        { texto: 'Circunferencia', esCorrecta: true },
        { texto: 'Diámetro', esCorrecta: false },
        { texto: 'Radio', esCorrecta: false },
        { texto: 'Área', esCorrecta: false },
      ],
    },
  ];

  for (const p of preguntasMatematicas) {
    await prisma.preguntas.create({
      data: {
        bancoId: bancoMatematicas.bancoId,
        texto: p.texto,
        categoria: 'Aritmética',
        nivel: 2,
        opciones: {
          create: p.opciones,
        },
      },
    });
  }
};
