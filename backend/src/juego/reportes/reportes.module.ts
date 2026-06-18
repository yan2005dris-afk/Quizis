import { Module } from '@nestjs/common';
import { ReportesController } from './interfaces/reportes.controller';
import { ReportesService } from './application/reportes.service';
import { DatabaseModule } from '../../core/database/prisma/prisma.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
