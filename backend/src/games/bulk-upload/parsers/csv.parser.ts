import * as XLSX from 'xlsx';
import type {
  ErrorParseo,
  OpcionParseada,
  PreguntaParseada,
  ResultadoParseo,
} from 'src/games/bulk-upload/types/bulk-upload.types';
import {
  COLUMNAS_REQUERIDAS,
  LETRAS_VALIDAS,
  normalizarClave,
  normalizarLetra,
  toStr,
} from 'src/games/bulk-upload/parsers/parser.utils';
import type { LetraOpcion } from 'src/games/bulk-upload/parsers/parser.utils';

/*
 * Columnas esperadas en el CSV (cabecera en primera fila):
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
 *   categoria          — categoría temática
 *   nivel              — número entero >= 1
 *   monto              — número positivo
 *   feedback_correcto
 *   feedback_incorrecto
 *
 * Ejemplo de fila:
 *   "¿Capital de Francia?","Madrid","París","Roma","Berlín","B","Geografía",1,1000,"¡Correcto!","Era París"
 */

export function parsearCsv(buffer: Buffer): ResultadoParseo {
  const preguntas: PreguntaParseada[] = [];
  const errores: ErrorParseo[] = [];

  const contenido = buffer.toString('utf-8');
  const workbook = XLSX.read(contenido, { type: 'string' });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: '',
    raw: false,
  });

  if (filas.length === 0) {
    return { preguntas, errores };
  }

  // Normalizar claves de la primera fila para validar columnas requeridas
  const clavesPresentes = Object.keys(filas[0]).map(normalizarClave);
  for (const col of COLUMNAS_REQUERIDAS) {
    if (!clavesPresentes.includes(col)) {
      errores.push({
        fila: 0,
        campo: col,
        mensaje: `Falta la columna obligatoria "${col}" en el encabezado del CSV.`,
      });
    }
  }

  if (errores.length > 0) return { preguntas, errores };

  filas.forEach((fila, index) => {
    const numFila = index + 1;
    const erroresFila: ErrorParseo[] = [];

    // Normalizar claves de la fila
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
