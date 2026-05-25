/** DTO para preguntas importadas desde archivo (sin IDs) */
export interface PreguntaDto {
  texto: string;
  opciones: OpcionDto[];
  categoria?: string;
  nivel?: number;
  monto?: number;
  feedbackCorrecto?: string;
  feedbackIncorrecto?: string;
  tiempoLimite?: number;
}

export interface OpcionDto {
  texto: string;
  esCorrecta: boolean;
}
