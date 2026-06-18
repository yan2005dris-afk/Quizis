export const GameEvents = {
  SALA: {
    PARTICIPANTE_UNIDO: 'sala.participante_unido',
    PARTICIPANTE_DESCONECTADO: 'sala.participante_desconectado',
    ESTADO_CAMBIADO: 'sala.estado_cambiado',
  },
  VOTOS: {
    CONSENSO_EVALUADO: 'votos.consenso_evaluado',
    VOTO_PUBLICO_RECIBIDO: 'votos.publico_recibido',
  },
  RONDAS: {
    PREGUNTA_LIBERADA: 'rondas.pregunta_liberada',
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
