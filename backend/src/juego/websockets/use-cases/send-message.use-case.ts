import { Injectable, Logger } from '@nestjs/common';
import { ChatCacheUseCase } from '../../../infrastructure/cache/use-cases/chat-cache.use-case';

export interface ChatMessage {
  usuario: string;
  texto: string;
  timestamp: number;
  tipo: 'mensaje' | 'sugerencia';
}

@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(private readonly chatCache: ChatCacheUseCase) {}

  async execute(payload: {
    tokenCompartido: string;
    nickname: string;
    texto: string;
    tipo: 'mensaje' | 'sugerencia';
  }): Promise<ChatMessage[]> {
    const message: ChatMessage = {
      usuario: payload.nickname,
      texto: payload.texto,
      timestamp: Date.now(),
      tipo: payload.tipo,
    };

    this.logger.log(
      `[CHAT] ${payload.nickname} en sala ${payload.tokenCompartido}: ${payload.texto}`,
    );

    return this.chatCache.addMessage(payload.tokenCompartido, message);
  }
}
