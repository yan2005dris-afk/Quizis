import { Module } from '@nestjs/common';
import { BancosController } from './bancos.controller';
import { BancosService } from './bancos.service';

@Module({
  controllers: [BancosController],
  providers: [BancosService],
})
export class BancosModule {}
