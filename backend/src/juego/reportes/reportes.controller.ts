import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
import { ReportesService } from './reportes.service';
import { GenerateReportDto } from './dtos/generate-report.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post('generar')
  async generarReporte(@Body() dto: GenerateReportDto) {
    const reportData = await this.reportesService.obtenerEstadisticas(
      dto.salaId,
    );
    return reportData;
  }
}
