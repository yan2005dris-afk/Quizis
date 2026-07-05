import { Module } from '@nestjs/common';
import { ChatService } from './application/chat.service';
import { SendMessageWebsocket } from './infrastructure/websockets/send-message.websocket';
import { ChatCacheService } from './infrastructure/cache/chat-cache.service';
import { CacheModule } from '../../core/cache/cache.module';
import { RoomBroadcastModule } from '../infrastructure/websockets/room-broadcast.module';
import { MensajesController } from './interfaces/controllers/mensajes.controller';

@Module({
  imports: [CacheModule, RoomBroadcastModule],
  controllers: [MensajesController],
  providers: [ChatService, SendMessageWebsocket, ChatCacheService],
  exports: [ChatService, ChatCacheService, SendMessageWebsocket],
})
export class ChatModule {}
