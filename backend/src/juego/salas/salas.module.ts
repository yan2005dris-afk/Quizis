import { Module } from '@nestjs/common';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaDetailUseCase } from './use-cases/get-sala-detail.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';

@Module({
  imports: [AuthModule],
  controllers: [SalasController],
  providers: [
    SalasService,
    ListAllSalasUseCase,
    GetSalaDetailUseCase,
    GetSalaLifelinesUseCase,
  ],
  exports: [SalasService],
})
export class SalasModule {}
