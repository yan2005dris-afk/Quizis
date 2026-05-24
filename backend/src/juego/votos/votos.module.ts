import { Module } from '@nestjs/common';
import { VotosService } from './votos.service';
import { VotosController } from './votos.controller';

@Module({
  controllers: [VotosController],
  providers: [VotosService],
  exports: [VotosService],
})
export class VotosModule {}
