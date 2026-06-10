import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BancosService } from '../application/bancos.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../core/common/guards/permissions.guard';
import { RequiredPermission } from '../../../core/common/decorators/require-permission.decorator';
import { AuthUserId } from '../../../core/common/decorators/auth-user-id.decorator';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@ApiTags('bancos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bancos')
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los bancos de preguntas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de bancos retornada exitosamente.',
  })
  @RequiredPermission('bancos', 'read')
  async findAll(@AuthUserId() usuarioId: number) {
    const bancos = await this.bancosService.findAll(usuarioId);
    return {
      success: true,
      message: 'Bancos recuperados exitosamente',
      data: bancos,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo banco de preguntas' })
  @ApiBody({ type: CreateBancoDto })
  @ApiResponse({ status: 201, description: 'Banco creado exitosamente.' })
  @RequiredPermission('bancos', 'create')
  async create(@Body() dto: CreateBancoDto, @AuthUserId() usuarioId: number) {
    const banco = await this.bancosService.create(dto, usuarioId);
    return {
      success: true,
      message: 'Banco creado exitosamente',
      data: banco,
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
  @RequiredPermission('bancos', 'read')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @AuthUserId() usuarioId: number,
  ) {
    const banco = await this.bancosService.findOne(id, usuarioId);
    return {
      success: true,
      message: 'Banco recuperado exitosamente',
      data: banco,
    };
  }

  @Post(':bancoId/preguntas')
  @ApiOperation({ summary: 'Crear preguntas en lote para un banco' })
  @ApiParam({ name: 'bancoId', type: Number })
  @ApiBody({
    description: 'Array de preguntas a crear',
    type: [Object], // TODO: replace with proper DTO
  })
  @ApiResponse({ status: 201, description: 'Preguntas creadas exitosamente.' })
  @RequiredPermission('bancos', 'create')
  async crearPreguntas(
    @Param('bancoId', ParseIntPipe) bancoId: number,
    @Body() preguntas: any[],
    @AuthUserId() usuarioId: number,
  ) {
    const totalCreadas = await this.bancosService.crearPreguntas(
      bancoId,
      preguntas,
      usuarioId,
    );
    return {
      success: true,
      message: 'Preguntas creadas exitosamente',
      data: { totalCreadas, bancoId },
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar metadatos de un banco (nombre, descripción)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: CreateBancoDto }) // Reuse CreateBancoDto for updates (fields are optional in implementation)
  @ApiResponse({ status: 200, description: 'Banco actualizado exitosamente.' })
  @RequiredPermission('bancos', 'update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBancoDto,
    @AuthUserId() usuarioId: number,
  ) {
    const banco = await this.bancosService.update(id, dto, usuarioId);
    return {
      success: true,
      message: 'Banco actualizado exitosamente',
      data: banco,
    };
  }

  @Patch(':bancoId/preguntas/:preguntaId')
  @ApiOperation({ summary: 'Actualizar una pregunta específica de un banco' })
  @ApiParam({ name: 'bancoId', type: Number })
  @ApiParam({ name: 'preguntaId', type: Number })
  @ApiBody({ type: UpdatePreguntaDto })
  @RequiredPermission('bancos', 'update')
  async updatePregunta(
    @Param('bancoId', ParseIntPipe) bancoId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Body() dto: UpdatePreguntaDto,
    @AuthUserId() usuarioId: number,
  ) {
    const bancoActualizado = await this.bancosService.updatePregunta(
      bancoId,
      preguntaId,
      dto,
      usuarioId,
    );
    return {
      success: true,
      message: 'Pregunta actualizada exitosamente',
      data: bancoActualizado,
    };
  }

  @Delete(':bancoId/preguntas/:preguntaId')
  @ApiOperation({
    summary: 'Eliminar (borrado lógico) una pregunta de un banco',
  })
  @ApiParam({ name: 'bancoId', type: Number })
  @ApiParam({ name: 'preguntaId', type: Number })
  @ApiResponse({ status: 200, description: 'Pregunta eliminada exitosamente.' })
  @ApiResponse({ status: 404, description: 'Pregunta o banco no encontrado.' })
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('bancos', 'delete')
  async deletePregunta(
    @Param('bancoId', ParseIntPipe) bancoId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @AuthUserId() usuarioId: number,
  ) {
    const result = await this.bancosService.deletePregunta(
      bancoId,
      preguntaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Pregunta eliminada exitosamente',
      data: result,
    };
  }
}
