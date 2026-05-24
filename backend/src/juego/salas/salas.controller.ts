import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SalasService } from './salas.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';

@ApiTags('salas')
@Controller('salas')
@UseGuards(JwtAuthGuard)
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas las salas activas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de salas con conteo de participantes.',
  })
  async listarTodas() {
    return this.salasService.listarTodas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una sala por ID con detalles' })
  @ApiResponse({
    status: 200,
    description: 'Sala encontrada con participantes y ronda activa.',
  })
  @ApiResponse({ status: 404, description: 'Sala no encontrada.' })
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.salasService.obtenerPorId(id);
  }
}
