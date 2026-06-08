import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageWebsocket } from './websockets/send-message.websocket';
import { ChatCacheService } from './cache/chat-cache.service';
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [ChatService, SendMessageWebsocket, ChatCacheService],
  exports: [ChatService, ChatCacheService, SendMessageWebsocket],
})
export class ChatModule {}
