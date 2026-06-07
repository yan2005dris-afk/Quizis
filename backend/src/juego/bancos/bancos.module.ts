import { Module } from '@nestjs/common';
import { BancosController } from './bancos.controller';
import { BancosService } from './bancos.service';
import { CreateBancoUseCase } from './use-cases/create-banco.use-case';
import { GetAllBancosUseCase } from './use-cases/get-all-bancos.use-case';
import { GetBancoUseCase } from './use-cases/get-banco.use-case';
import { UpdateBancoUseCase } from './use-cases/update-banco.use-case';
import { AddQuestionsUseCase } from './use-cases/add-questions.use-case';
import { UpdateQuestionUseCase } from './use-cases/update-question.use-case';
import { DeleteQuestionUseCase } from './use-cases/delete-question.use-case';

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
