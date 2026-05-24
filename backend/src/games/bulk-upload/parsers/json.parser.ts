import { BadRequestException } from '@nestjs/common';
import type {
  ErrorParseo,
  OpcionParseada,
  PreguntaParseada,
  ResultadoParseo,
} from 'src/games/bulk-upload/types/bulk-upload.types';

/*
 * Estructura esperada del JSON:
 * [
 *   {
 *     "texto": "¿Cuál es la capital de Francia?",
 *     "categoria": "Geografía",          (opcional)
 *     "nivel": 1,                         (opcional)
 *     "monto": 1000,                      (opcional)
 *     "feedbackCorrecto": "...",          (opcional)
 *     "feedbackIncorrecto": "...",        (opcional)
 *     "opciones": [
 *       { "texto": "Madrid",  "esCorrecta": false },
 *       { "texto": "París",   "esCorrecta": true  },
 *       { "texto": "Roma",    "esCorrecta": false },
 *       { "texto": "Berlín",  "esCorrecta": false }
 *     ]
 *   }
 * ]
 */
export function parsearJson(buffer: Buffer): ResultadoParseo {
  const preguntas: PreguntaParseada[] = [];
  const errores: ErrorParseo[] = [];

  let datos: unknown;

  try {
    datos = JSON.parse(buffer.toString('utf-8'));
  } catch {
    throw new BadRequestException(
      'El archivo JSON no tiene un formato válido. Verifique que sea un JSON bien formado.',
    );
  }

  if (!Array.isArray(datos)) {
    throw new BadRequestException(
      'El archivo JSON debe contener un arreglo de preguntas en la raíz.',
    );
  }

  datos.forEach((item: unknown, index: number) => {
    const fila = index + 1;
    const erroresFila: ErrorParseo[] = [];

    if (typeof item !== 'object' || item === null) {
      errores.push({
        fila,
        campo: 'fila',
        mensaje: 'Cada elemento del arreglo debe ser un objeto.',
      });
      return;
    }

    const entrada = item as Record<string, unknown>;

    // Validar texto de la pregunta
    if (
      !entrada.texto ||
      typeof entrada.texto !== 'string' ||
      entrada.texto.trim() === ''
    ) {
      erroresFila.push({
        fila,
        campo: 'texto',
        mensaje: 'El campo "texto" es obligatorio y no puede estar vacío.',
      });
    }

    // Validar opciones
    if (!Array.isArray(entrada.opciones)) {
      erroresFila.push({
        fila,
        campo: 'opciones',
        mensaje: 'El campo "opciones" debe ser un arreglo.',
      });
    } else {
      if (entrada.opciones.length !== 4) {
        erroresFila.push({
          fila,
          campo: 'opciones',
          mensaje: `La pregunta debe tener exactamente 4 opciones. Se encontraron ${entrada.opciones.length}.`,
        });
      } else {
        const opcionesValidas = (entrada.opciones as unknown[]).every(
          (op) =>
            typeof op === 'object' &&
            op !== null &&
            typeof (op as Record<string, unknown>).texto === 'string' &&
            (op as Record<string, unknown>).texto !== '' &&
            typeof (op as Record<string, unknown>).esCorrecta === 'boolean',
        );

        if (!opcionesValidas) {
          erroresFila.push({
            fila,
            campo: 'opciones',
            mensaje:
              'Cada opción debe tener "texto" (string) y "esCorrecta" (boolean).',
          });
        } else {
          const correctas = (
            entrada.opciones as Record<string, unknown>[]
          ).filter((op) => op.esCorrecta === true);

          if (correctas.length !== 1) {
            erroresFila.push({
              fila,
              campo: 'opciones',
              mensaje: `Debe haber exactamente 1 opción correcta. Se encontraron ${correctas.length}.`,
            });
          }
        }
      }
    }

    if (erroresFila.length > 0) {
      errores.push(...erroresFila);
      return;
    }

    const opciones: OpcionParseada[] = (
      entrada.opciones as Record<string, unknown>[]
    ).map((op) => ({
      texto: String(op.texto).trim(),
      esCorrecta: Boolean(op.esCorrecta),
    }));

    const pregunta: PreguntaParseada = {
      texto: (entrada.texto as string).trim(),
      opciones,
    };

    if (
      typeof entrada.categoria === 'string' &&
      entrada.categoria.trim() !== ''
    ) {
      pregunta.categoria = entrada.categoria.trim();
    }

    if (typeof entrada.nivel === 'number' && entrada.nivel >= 1) {
      pregunta.nivel = Math.round(entrada.nivel);
    }

    if (typeof entrada.monto === 'number' && entrada.monto > 0) {
      pregunta.monto = entrada.monto;
    }

    if (
      typeof entrada.feedbackCorrecto === 'string' &&
      entrada.feedbackCorrecto.trim() !== ''
    ) {
      pregunta.feedbackCorrecto = entrada.feedbackCorrecto.trim();
    }

    if (
      typeof entrada.feedbackIncorrecto === 'string' &&
      entrada.feedbackIncorrecto.trim() !== ''
    ) {
      pregunta.feedbackIncorrecto = entrada.feedbackIncorrecto.trim();
    }

    preguntas.push(pregunta);
  });

  return { preguntas, errores };
}
