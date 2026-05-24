import { Module } from '@nestjs/common';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { DatabaseModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SalasController],
  providers: [SalasService, CreateSalaUseCase, UpdateEstadoSalaUseCase],
  exports: [SalasService],
})
export class SalasModule {}
