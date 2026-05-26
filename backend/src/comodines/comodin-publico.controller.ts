import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { ComodinPublicoService } from './comodin-publico.service';

@ApiTags('lifelines')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('lifelines')
export class ComodinPublicoController {

  constructor(private readonly service: ComodinPublicoService) {}

  @Post(':token/publico')
  @ApiOperation({ summary: 'Activa comodín del público' })
  activar(@Param('token') token: string) {
    return this.service.activarComodinPublico(token);
  }
}