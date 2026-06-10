import { Module } from '@nestjs/common';
import { ChatService } from './application/chat.service';
import { SendMessageWebsocket } from './infrastructure/websockets/send-message.websocket';
import { ChatCacheService } from './infrastructure/cache/chat-cache.service';
import { CacheModule } from '../../core/cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [ChatService, SendMessageWebsocket, ChatCacheService],
  exports: [ChatService, ChatCacheService, SendMessageWebsocket],
})
export class ChatModule {}
