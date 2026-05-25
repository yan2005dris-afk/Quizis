import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
import { ReportsService } from './reportes.service';
import { GenerateReportDto } from './dtos/generate-report.dto';
import { ExcelExportStrategy } from './excel-export.strategy';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  private readonly excelStrategy = new ExcelExportStrategy();

  constructor(private readonly reportsService: ReportsService) {}

  @Post('generar')
  @HttpCode(200)
  async generarReporte(
    @Body() dto: GenerateReportDto,
    @Res() response: Response,
  ) {
    try {
      const reportData = await this.reportsService.getGameStatistics(
        dto.salaId,
      );

      if (dto.formato === 'excel') {
        const buffer = await this.excelStrategy.export(reportData);
        const nombreArchivo = `quizis_reporte_sala${dto.salaId}_${new Date().getTime()}.xlsx`;

        response.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        response.setHeader(
          'Content-Disposition',
          `attachment; filename="${nombreArchivo}"`,
        );

        response.send(buffer);
      } else if (dto.formato === 'csv') {
        throw new BadRequestException('Formato CSV aún no implementado');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error generando reporte: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
      );
    }
  }
}
