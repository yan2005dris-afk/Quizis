import { Module } from '@nestjs/common';
import { BancosController } from './interfaces/bancos.controller';
import { BancosService } from './application/bancos.service';
import { CreateBancoUseCase } from './application/use-cases/create-banco.use-case';
import { GetAllBancosUseCase } from './application/use-cases/get-all-bancos.use-case';
import { GetBancoUseCase } from './application/use-cases/get-banco.use-case';
import { UpdateBancoUseCase } from './application/use-cases/update-banco.use-case';
import { AddQuestionsUseCase } from './application/use-cases/add-questions.use-case';
import { UpdateQuestionUseCase } from './application/use-cases/update-question.use-case';
import { DeleteQuestionUseCase } from './application/use-cases/delete-question.use-case';

@Module({
  controllers: [BancosController],
  providers: [
    BancosService,
    CreateBancoUseCase,
    GetAllBancosUseCase,
    GetBancoUseCase,
    UpdateBancoUseCase,
    AddQuestionsUseCase,
    UpdateQuestionUseCase,
    DeleteQuestionUseCase,
  ],
  exports: [BancosService],
})
export class BancosModule {}
