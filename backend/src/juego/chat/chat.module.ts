import { Module } from '@nestjs/common';
import { ChatService } from './application/chat.service';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { ChatCacheService } from './infrastructure/cache/chat-cache.service';
import { CacheModule } from '../../core/cache/cache.module';
import { RoomBroadcastModule } from '../infrastructure/websockets/room-broadcast.module';
import { JuegoAuthModule } from '../shared/auth/juego-auth.module';
import { MensajesController } from './interfaces/controllers/mensajes.controller';

@Module({
  imports: [CacheModule, RoomBroadcastModule, JuegoAuthModule],
  controllers: [MensajesController],
  providers: [ChatService, SendMessageUseCase, ChatCacheService],
  exports: [ChatService, ChatCacheService, SendMessageUseCase],
})
export class ChatModule {}
