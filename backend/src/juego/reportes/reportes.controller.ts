import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
import { ReportsService } from './reportes.service';
import { GenerateReportDto } from './dtos/generate-report.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generar')
  async generarReporte(@Body() dto: GenerateReportDto) {
    const reportData = await this.reportsService.getGameStatistics(dto.salaId);
    return reportData;
  }
}
