import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';

@Module({
  // Los Gateways siempre van en el arreglo de providers
  providers: [QuizGateway],
  // Lo exportamos por si otro módulo necesita usarlo después
  exports: [QuizGateway], 
})
export class WebsocketsModule {}