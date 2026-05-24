import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';

@Module({
  providers: [QuizGateway],
})
export class WebsocketsModule {}