import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';
import { ComodinesModule } from '../comodines/comodines.module';

@Module({
  imports: [ComodinesModule],
  providers: [QuizGateway],
})
export class WebsocketsModule {}
