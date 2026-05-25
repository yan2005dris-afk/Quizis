import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';
import { JuegoGateway } from './juego.gateway';

@Module({
  providers: [QuizGateway, JuegoGateway],
})
export class WebsocketsModule {}
