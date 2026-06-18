import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';
import { RecordAnswerUseCase } from './application/use-cases/record-answer.use-case';

@Module({
  imports: [DatabaseModule],
  providers: [RecordAnswerUseCase],
  exports: [RecordAnswerUseCase],
})
export class RespuestasModule {}
