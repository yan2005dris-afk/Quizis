import { Injectable } from '@nestjs/common';
import { SendMessageWebsocket } from '../infrastructure/websockets/send-message.websocket';
import { ChatCacheService } from '../infrastructure/cache/chat-cache.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly sendMessageWebsocket: SendMessageWebsocket,
    private readonly chatCache: ChatCacheService,
  ) {}

  async sendMessage(payload: {
    tokenCompartido: string;
    nickname: string;
    texto: string;
    tipo: 'mensaje' | 'sugerencia';
  }) {
    return this.sendMessageWebsocket.execute(payload);
  }

  async getChatMessages(tokenCompartido: string) {
    return this.chatCache.getMessages(tokenCompartido);
  }
}
