import { Injectable, Logger } from '@nestjs/common';
import { ChatCacheService } from '../../infrastructure/cache/chat-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameEvents } from '../../../../core/common/events/game-events.types';
import { ChatMessage } from '../../domain/types/chat.types';

/**
 * NOTE: the name `SendMessageWebsocket` is a historical artifact from the
 * WS-only era. After the N1/N2 migration to REST, this class is now a use-case
 * invoked by `MensajesController.send()` (REST) AND keeps the WS-equivalent
 * broadcast so connected clients receive live updates. We keep the name to
 * avoid touching every import; a future rename can drop the "Websocket" suffix.
 */
@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(
    private readonly chatCache: ChatCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    const mensajes = await this.chatCache.addMessage(
      payload.tokenCompartido,
      message,
    );

    // WS-equivalent of the old `enviar_mensaje` handler: tell every connected
    // client in the room that the chat list changed. The frontend's join
    // handler already listens for `mensaje_chat` (see juego.gateway.ts:415),
    // so this restores the live update that the REST migration dropped.
    this.eventEmitter.emit(GameEvents.CHAT.MENSAJE_ENVIADO, {
      tokenCompartido: payload.tokenCompartido,
      mensajes,
    });

    return mensajes;
  }
}
