import { Injectable } from '@nestjs/common';
import { SendMessageUseCase } from './use-cases/send-message.use-case';
import { ChatCacheService } from '../infrastructure/cache/chat-cache.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly chatCache: ChatCacheService,
  ) {}

  async sendMessage(payload: {
    tokenCompartido: string;
    nickname: string;
    texto: string;
    tipo: 'mensaje' | 'sugerencia';
  }) {
    return this.sendMessageUseCase.execute(payload);
  }

  async getChatMessages(tokenCompartido: string) {
    return this.chatCache.getMessages(tokenCompartido);
  }
}
