import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaEstadoDto } from './dto/update-sala-estado.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/common/guards/roles.guard';
import { RequireRole } from '../../infrastructure/common/decorators/require-role.decorator';
import { AuthUserId } from '../../infrastructure/common/decorators/auth-user-id.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('salas')
@ApiBearerAuth()
@Controller('salas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @ApiOperation({ summary: 'Crear una nueva sala' })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  @RequireRole('ADMIN')
  @Post()
  async create(
    @AuthUserId() adminId: number,
    @Body() createSalaDto: CreateSalaDto,
  ) {
    return this.salasService.createSala(adminId, createSalaDto);
  }

  @ApiOperation({ summary: 'Actualizar el estado de la sala' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'Transición inválida' })
  @RequireRole('ADMIN')
  @Patch(':id/estado')
  async updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalaEstadoDto: UpdateSalaEstadoDto,
  ) {
    return this.salasService.updateEstado(id, updateSalaEstadoDto.estado);
  }
}
