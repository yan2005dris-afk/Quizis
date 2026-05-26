import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportsService } from './reportes.service';
import { DatabaseModule } from 'src/infrastructure/database/prisma/prisma.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportesController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportesModule {}