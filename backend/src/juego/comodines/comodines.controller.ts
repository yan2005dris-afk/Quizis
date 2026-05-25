import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ComodinesService } from './comodines.service';

@ApiTags('lifelines')
@Controller('comodines')
export class ComodinesController {
  constructor(private readonly comodinesService: ComodinesService) {}

  @Post('ia/sugerencia')
  @ApiOperation({ summary: 'Obtener sugerencia de la IA para una pregunta' })
  @ApiResponse({ status: 200, description: 'Sugerencia generada exitosamente.' })
  async solicitarSugerenciaIa(@Body('pregunta') pregunta: string) {
    return await this.comodinesService.obtenerSugerenciaIa(pregunta);
  }

  @Get('publico/resultados/:rondaId/:preguntaId')
  @ApiOperation({ summary: 'Obtener resultados actuales de la votación del público' })
  async obtenerResultadosPublico(
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
  ) {
    return await this.comodinesService.obtenerResultadosPublico(rondaId, preguntaId);
  }

  @Post('llamada/seleccionar/:tokenCompartido')
  @ApiOperation({ summary: 'Seleccionar un consultor aleatorio entre los observadores conectados' })
  async seleccionarConsultor(
    @Param('tokenCompartido') tokenCompartido: string,
  ) {
    return await this.comodinesService.seleccionarConsultorAleatorio(tokenCompartido);
  }
}
