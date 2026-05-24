export interface OpcionParseada {
  texto: string;
  esCorrecta: boolean;
}

export interface PreguntaParseada {
  texto: string;
  categoria?: string;
  nivel?: number;
  monto?: number;
  feedbackCorrecto?: string;
  feedbackIncorrecto?: string;
  opciones: OpcionParseada[];
}

export interface ErrorParseo {
  fila: number;
  campo: string;
  mensaje: string;
}

export interface ResultadoParseo {
  preguntas: PreguntaParseada[];
  errores: ErrorParseo[];
}

export type FormatoArchivo = 'json' | 'csv' | 'excel';
