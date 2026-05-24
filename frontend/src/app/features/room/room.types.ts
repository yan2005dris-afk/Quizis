export interface ChatMessage {
  usuario: string;
  texto: string;
  timestamp: number;
  tipo: 'mensaje' | 'sugerencia';
}

export interface SalaEvento {
  tipo: 'inicio_pregunta' | 'voto' | 'comodin' | 'usuario_entra' | 'usuario_sale';
  mensaje: string;
  timestamp: number;
}

export interface Participante {
  id: string;
  nombre: string;
  puntaje: number;
}

export interface RondaInfo {
  ronda: number;
  totalRondas: number;
  premio: string;
}
