export const GameEvents = {
  SALA: {
    PARTICIPANTE_UNIDO: 'sala.participante_unido',
    PARTICIPANTE_DESCONECTADO: 'sala.participante_desconectado',
    ESTADO_CAMBIADO: 'sala.estado_cambiado',
    TOKEN_REGENERADO: 'sala.token_regenerado',
  },
  VOTOS: {
    CONSENSO_EVALUADO: 'votos.consenso_evaluado',
    VOTO_PUBLICO_RECIBIDO: 'votos.publico_recibido',
  },
  RONDAS: {
    PREGUNTA_LIBERADA: 'rondas.pregunta_liberada',
    RONDA_REINICIADA: 'rondas.reiniciada',
  },
} as const;

export interface ParticipanteJoinedEvent {
  tokenCompartido: string;
  nickname: string;
  socketId: string;
}

export interface ParticipanteDisconnectedEvent {
  tokenCompartido: string;
  nickname: string;
  socketId: string;
}

export interface ConsensusEvaluatedEvent {
  tokenCompartido: string;
  preguntaId: number;
  result: any; // ConsensusResult
}

export interface TokenRegeneradoEvent {
  /** The token the socket clients are currently joined under (room name). */
  tokenCompartidoViejo: string;
  /** The new token (next time anyone joins they need this). */
  tokenCompartidoNuevo: string;
  /** The signed JWT for the new link — the admin client uses it to display
   *  the new shareable URL. Other connected clients don't need it (they're
   *  already in the room); we still include it for completeness. */
  tokenInvitacion: string;
}

export interface RondaReiniciadaEvent {
  tokenCompartido: string;
  estado: string;
  rondaActiva: {
    rondaId: number;
    numeroRonda: number;
    estado: string;
    fechaInicio: string | null;
    preguntaActualId: number | null;
    preguntaActual: any | null;
    historialPreguntas: Array<{
      preguntaId: number;
      texto: string;
      nivel: number;
      feedbackCorrecto: string | null;
      feedbackIncorrecto: string | null;
      opciones: Array<{
        opcionId: number;
        texto: string;
        letra: string;
        // esCorrecta is INTENTIONALLY OMITTED in the broadcast payload —
        // the admin's response still includes it (legitimate caller), but
        // the WS broadcast to students must strip it (security fix).
      }>;
      respuestaDada: any | null;
    }>;
  };
}
