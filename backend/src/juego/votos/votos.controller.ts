import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { VotosService } from './votos.service';
import { IsNotEmpty, IsNumber } from 'class-validator';

class RegistrarVotoDto {
  @IsNumber()
  @IsNotEmpty()
  rondaId: number;

  @IsNumber()
  @IsNotEmpty()
  preguntaId: number;

  @IsNumber()
  @IsNotEmpty()
  participanteId: number;

  @IsNumber()
  @IsNotEmpty()
  opcionId: number;
}

@ApiTags('audience-votes')
@Controller('votos')
export class VotosController {
  constructor(private readonly votosService: VotosService) {}

  @Post()
  @ApiOperation({ summary: 'Registra un voto temporal de audiencia en caché' })
  @ApiResponse({ status: 201, description: 'Voto registrado en el caché.' })
  async registrarVoto(@Body() dto: RegistrarVotoDto) {
    await this.votosService.registrarVoto(dto.rondaId, dto.preguntaId, dto.participanteId, dto.opcionId);
    return { success: true, message: 'Voto guardado en caché temporal.' };
  }

  @Get('cache/:rondaId/:preguntaId')
  @ApiOperation({ summary: 'Obtiene el listado de votos acumulados en caché' })
  async obtenerVotosCache(
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
  ) {
    return this.votosService.obtenerVotosCache(rondaId, preguntaId);
  }

  @Post('persistir/:rondaId/:preguntaId')
  @ApiOperation({ summary: 'Dispara manualmente el bulk-insert para persistir los votos de una pregunta finalizada' })
  async persistirVotos(
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
  ) {
    const res = await this.votosService.persistirVotos(rondaId, preguntaId);
    return { success: true, count: res.count, message: 'Votos persistidos masivamente en PostgreSQL.' };
  }
}
