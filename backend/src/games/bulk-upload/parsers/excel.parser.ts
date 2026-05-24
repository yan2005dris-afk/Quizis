import * as XLSX from 'xlsx';
import type {
  ErrorParseo,
  OpcionParseada,
  PreguntaParseada,
  ResultadoParseo,
} from 'src/games/bulk-upload/types/bulk-upload.types';

/*
 * Columnas esperadas en la primera hoja del Excel (cabecera en fila 1):
 *
 * Obligatorias:
 *   texto       — enunciado de la pregunta
 *   opcion_a    — primera opción
 *   opcion_b    — segunda opción
 *   opcion_c    — tercera opción
 *   opcion_d    — cuarta opción
 *   correcta    — letra de la opción correcta: A, B, C o D
 *
 * Opcionales:
 *   categoria
 *   nivel
 *   monto
 *   feedback_correcto
 *   feedback_incorrecto
 */

const COLUMNAS_REQUERIDAS = [
  'texto',
  'opcion_a',
  'opcion_b',
  'opcion_c',
  'opcion_d',
  'correcta',
] as const;
const LETRAS_VALIDAS = ['a', 'b', 'c', 'd'] as const;

type LetraOpcion = (typeof LETRAS_VALIDAS)[number];

function normalizarClave(clave: string): string {
  return clave.toLowerCase().trim().replace(/\s+/g, '_');
}

function toStr(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean')
    return String(valor);
  return '';
}

function normalizarLetra(valor: unknown): LetraOpcion | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const letra = String(valor).toLowerCase().trim();
  if ((LETRAS_VALIDAS as readonly string[]).includes(letra)) {
    return letra as LetraOpcion;
  }
  const mapaNumero: Record<string, LetraOpcion> = {
    '1': 'a',
    '2': 'b',
    '3': 'c',
    '4': 'd',
  };
  return mapaNumero[letra] ?? null;
}

export function parsearExcel(buffer: Buffer): ResultadoParseo {
  const preguntas: PreguntaParseada[] = [];
  const errores: ErrorParseo[] = [];

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch {
    throw new Error(
      'No se pudo leer el archivo Excel. Verifique que sea un archivo .xlsx o .xls válido.',
    );
  }

  if (workbook.SheetNames.length === 0) {
    return { preguntas, errores };
  }

  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: '',
    raw: false,
  });

  if (filas.length === 0) {
    return { preguntas, errores };
  }

  // Verificar columnas requeridas en el encabezado
  const clavesPresentes = Object.keys(filas[0]).map(normalizarClave);
  for (const col of COLUMNAS_REQUERIDAS) {
    if (!clavesPresentes.includes(col)) {
      errores.push({
        fila: 0,
        campo: col,
        mensaje: `Falta la columna obligatoria "${col}" en el encabezado del Excel.`,
      });
    }
  }

  if (errores.length > 0) return { preguntas, errores };

  filas.forEach((fila, index) => {
    const numFila = index + 1;
    const erroresFila: ErrorParseo[] = [];

    // Normalizar claves para tolerar variaciones en mayúsculas y espacios
    const datos: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(fila)) {
      datos[normalizarClave(clave)] = valor;
    }

    const texto = toStr(datos['texto']).trim();
    if (!texto) {
      erroresFila.push({
        fila: numFila,
        campo: 'texto',
        mensaje: 'El campo "texto" es obligatorio y no puede estar vacío.',
      });
    }

    const opcionA = toStr(datos['opcion_a']).trim();
    const opcionB = toStr(datos['opcion_b']).trim();
    const opcionC = toStr(datos['opcion_c']).trim();
    const opcionD = toStr(datos['opcion_d']).trim();

    if (!opcionA)
      erroresFila.push({
        fila: numFila,
        campo: 'opcion_a',
        mensaje: 'La opción A no puede estar vacía.',
      });
    if (!opcionB)
      erroresFila.push({
        fila: numFila,
        campo: 'opcion_b',
        mensaje: 'La opción B no puede estar vacía.',
      });
    if (!opcionC)
      erroresFila.push({
        fila: numFila,
        campo: 'opcion_c',
        mensaje: 'La opción C no puede estar vacía.',
      });
    if (!opcionD)
      erroresFila.push({
        fila: numFila,
        campo: 'opcion_d',
        mensaje: 'La opción D no puede estar vacía.',
      });

    const letraCorrecta = normalizarLetra(datos['correcta']);
    if (!letraCorrecta) {
      erroresFila.push({
        fila: numFila,
        campo: 'correcta',
        mensaje: 'El campo "correcta" debe ser A, B, C o D (o 1, 2, 3, 4).',
      });
    }

    if (erroresFila.length > 0) {
      errores.push(...erroresFila);
      return;
    }

    const mapaOpciones: Record<LetraOpcion, string> = {
      a: opcionA,
      b: opcionB,
      c: opcionC,
      d: opcionD,
    };

    const opciones: OpcionParseada[] = (
      LETRAS_VALIDAS as readonly LetraOpcion[]
    ).map((letra) => ({
      texto: mapaOpciones[letra],
      esCorrecta: letra === letraCorrecta,
    }));

    const pregunta: PreguntaParseada = { texto, opciones };

    const categoria = toStr(datos['categoria']).trim();
    if (categoria) pregunta.categoria = categoria;

    const nivelRaw = Number(datos['nivel']);
    if (!isNaN(nivelRaw) && nivelRaw >= 1)
      pregunta.nivel = Math.round(nivelRaw);

    const montoRaw = Number(datos['monto']);
    if (!isNaN(montoRaw) && montoRaw > 0) pregunta.monto = montoRaw;

    const feedbackCorrecto = toStr(datos['feedback_correcto']).trim();
    if (feedbackCorrecto) pregunta.feedbackCorrecto = feedbackCorrecto;

    const feedbackIncorrecto = toStr(datos['feedback_incorrecto']).trim();
    if (feedbackIncorrecto) pregunta.feedbackIncorrecto = feedbackIncorrecto;

    preguntas.push(pregunta);
  });

  return { preguntas, errores };
}
