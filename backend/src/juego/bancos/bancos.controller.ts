import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BancosService } from './bancos.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@ApiTags('bancos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bancos')
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los bancos de preguntas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de bancos retornada exitosamente.',
  })
  async findAll() {
    const bancos = await this.bancosService.findAll();
    return {
      success: true,
      message: 'Bancos recuperados exitosamente',
      data: bancos,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Obtener un banco de preguntas específico con sus preguntas y opciones',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del banco de preguntas',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Banco de preguntas retornado exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Banco de preguntas no encontrado.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const banco = await this.bancosService.findOne(id);
    return {
      success: true,
      message: 'Banco recuperado exitosamente',
      data: banco,
    };
  }

  @Patch(':bancoId/preguntas/:preguntaId')
  @ApiOperation({ summary: 'Actualizar una pregunta específica de un banco' })
  @ApiParam({ name: 'bancoId', type: Number })
  @ApiParam({ name: 'preguntaId', type: Number })
  @ApiBody({ type: UpdatePreguntaDto })
  async updatePregunta(
    @Param('bancoId', ParseIntPipe) bancoId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Body() dto: UpdatePreguntaDto,
  ) {
    const bancoActualizado = await this.bancosService.updatePregunta(
      bancoId,
      preguntaId,
      dto,
    );
    return {
      success: true,
      message: 'Pregunta actualizada exitosamente',
      data: bancoActualizado,
    };
  }
}
