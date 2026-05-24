import { Module } from '@nestjs/common';
import { RondasController } from './rondas.controller';
import { RondasService } from './rondas.service';
import { InitRondaUseCase } from './use-cases/init-ronda.use-case';
import { DatabaseModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RondasController],
  providers: [RondasService, InitRondaUseCase],
  exports: [RondasService],
})
export class RondasModule {}
