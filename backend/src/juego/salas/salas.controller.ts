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
import { Public } from '../../infrastructure/common/decorators/public.decorator';

@ApiTags('salas')
@Controller('salas')
@UseGuards(JwtAuthGuard)
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista todas las salas activas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de salas con conteo de participantes.',
  })
  async listarTodas() {
    return this.salasService.listarTodas();
  }

  @Public()
  @Get(':idOrToken')
  @ApiOperation({ summary: 'Obtiene una sala por ID o Token con detalles' })
  @ApiResponse({
    status: 200,
    description: 'Sala encontrada con participantes y ronda activa.',
  })
  @ApiResponse({ status: 404, description: 'Sala no encontrada.' })
  async obtenerPorId(@Param('idOrToken') idOrToken: string) {
    return this.salasService.obtenerPorId(idOrToken);
  }

  @Public()
  @Get(':idOrToken/comodines')
  @ApiOperation({ summary: 'Obtiene los comodines de una sala' })
  @ApiResponse({
    status: 200,
    description: 'Lista de comodines configurados para la sala.',
  })
  async obtenerComodines(@Param('idOrToken') idOrToken: string) {
    return this.salasService.obtenerComodines(idOrToken);
  }
}
