import { Injectable, Logger } from '@nestjs/common';
import { ChatCacheUseCase } from '../../../infrastructure/cache/use-cases/chat-cache.use-case';
import { ChatMessage } from '../types/chat.types';

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

    const logText = payload.texto.replace(/[\n\r]/g, ' ').substring(0, 120);
    this.logger.log(
      `[CHAT] ${payload.nickname} en sala ${payload.tokenCompartido}: ${logText}`,
    );

    return this.chatCache.addMessage(payload.tokenCompartido, message);
  }
}
