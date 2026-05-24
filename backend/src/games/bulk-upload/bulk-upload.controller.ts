import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from 'src/infrastructure/common/decorators/require-permission.decorator';
import { BulkUploadService } from 'src/games/bulk-upload/bulk-upload.service';
import { GuardarPreguntasDto } from 'src/games/bulk-upload/dto/guardar-preguntas.dto';

@ApiTags('bulk-upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bulk-upload')
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @ApiOperation({
    summary: 'Guardar preguntas masivamente',
    description:
      'Recibe las preguntas ya parseadas por el frontend y las persiste masivamente ' +
      'en el banco de preguntas indicado. Cada pregunta puede tener entre 2 y 10 opciones ' +
      'y exactamente una debe estar marcada como correcta.',
  })
  @ApiBody({ type: GuardarPreguntasDto })
  @ApiResponse({
    status: 201,
    description: 'Preguntas guardadas exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o sin opción correcta.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Sin permiso para cargar preguntas.',
  })
  @ApiResponse({
    status: 404,
    description: 'Banco de preguntas no encontrado.',
  })
  @RequiredPermission('bulk-upload', 'create')
  @Post('guardar')
  guardarPreguntas(@Body() dto: GuardarPreguntasDto) {
    return this.bulkUploadService.guardarPreguntas(dto);
  }
}
