import { Controller, Post, Body } from '@nestjs/common';
import { ComodinIaService } from './comodin-ia.service';

@Controller('comodines/ia')
export class ComodinIaController {
  constructor(private readonly iaService: ComodinIaService) {}

  @Post('sugerencia')
  async solicitarSugerencia(@Body('pregunta') pregunta: string) {
    return await this.iaService.obtenerSugerenciaIa(pregunta);
  }
}
