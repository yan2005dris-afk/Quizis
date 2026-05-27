export interface ChatMessage {
  usuario: string;
  texto: string;
  timestamp: number;
  tipo: 'mensaje' | 'sugerencia';
}
