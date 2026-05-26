import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComodinPublicoService } from './comodin-publico.service';

@ApiTags('lifelines')
@ApiBearerAuth('JWT')
@Controller('lifelines')
export class ComodinPublicoController {

  constructor(private readonly service: ComodinPublicoService) {}

  @Post(':token/publico')
  @ApiOperation({ summary: 'Activa comodín del público' })
  activar(@Param('token') token: string) {
    return this.service.activarComodinPublico(token);
  }
}