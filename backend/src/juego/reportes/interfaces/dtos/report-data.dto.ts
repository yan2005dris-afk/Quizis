export class ReportDataDto {
  salaId!: number;
  nombreSala!: string;
  docente!: string;
  fechaCreacion!: Date;

  rondas!: Array<{
    numeroRonda: number;
    participanteNickname: string;
    totalPreguntas: number;
    correctas: number;
    incorrectas: number;
    porcentajeAcierto: number;
    comodinesUsados: string[];
    preguntas: Array<{
      numero: number;
      texto: string;
      respuestaElegida: string;
      esCorrecta: boolean;
      comodinUsado?: string;
      porcentajeVotosPublico?: number;
    }>;
  }>;

  resumenGeneral!: {
    totalRondas: number;
    participantes: string[];
    totalPreguntasRespondidas: number;
    totalCorrectas: number;
    totalIncorrectas: number;
    porcentajeGlobal: number;
  };
}
