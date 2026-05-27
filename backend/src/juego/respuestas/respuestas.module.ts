import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/prisma/prisma.module';
import { RecordAnswerUseCase } from './use-cases/record-answer.use-case';

@Module({
  imports: [DatabaseModule],
  providers: [RecordAnswerUseCase],
  exports: [RecordAnswerUseCase],
})
export class RespuestasModule {}
