import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/identity/auth/infrastructure/guards/jwt-auth.guard';
import { ReportesService } from '../application/reportes.service';
import { GenerateReportDto } from './dtos/generate-report.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get(':salaId')
  async obtenerReporte(@Param('salaId') salaId: string) {
    return this.reportesService.obtenerEstadisticas(+salaId);
  }

  @Post('generar')
  async generarReporte(@Body() dto: GenerateReportDto) {
    const reportData = await this.reportesService.obtenerEstadisticas(
      dto.salaId,
    );
    return reportData;
  }
}
