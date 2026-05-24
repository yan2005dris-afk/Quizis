import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from 'src/infrastructure/common/decorators/require-permission.decorator';
import { BulkUploadService } from 'src/games/bulk-upload/bulk-upload.service';
import {
  ErrorParseoEntity,
  OpcionParseadaEntity,
  PreviewCargaMasivaEntity,
  PreguntaParseadaEntity,
} from 'src/games/bulk-upload/entities/bulk-upload.entity';

// Tipo local para el archivo de multer (evita dependencia del namespace global de Express)
interface ArchivoMulter {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const TAMANIO_MAXIMO_MB = 10;
const TAMANIO_MAXIMO_BYTES = TAMANIO_MAXIMO_MB * 1024 * 1024;

const MIME_PERMITIDOS = new Set([
  'application/json',
  'text/json',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const EXTENSIONES_PERMITIDAS = new Set(['.json', '.csv', '.xlsx', '.xls']);

function extraerExtension(nombreArchivo: string): string {
  const match = nombreArchivo.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

@ApiTags('bulk-upload')
@ApiBearerAuth()
@ApiExtraModels(
  PreviewCargaMasivaEntity,
  PreguntaParseadaEntity,
  OpcionParseadaEntity,
  ErrorParseoEntity,
)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bulk-upload')
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  /**
   * Recibe un archivo (JSON, CSV o Excel) con preguntas y retorna un preview
   * con cuántas preguntas fueron detectadas y si hubo errores de formato.
   * No guarda nada en base de datos — la persistencia es responsabilidad de otro endpoint.
   */
  @ApiOperation({
    summary: 'Parsear archivo de preguntas',
    description:
      'Recibe un archivo en formato JSON, CSV o Excel (.xlsx/.xls) y devuelve ' +
      'un preview con las preguntas detectadas y los errores de formato encontrados. ' +
      'No persiste datos en la base de datos.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de preguntas a parsear',
    schema: {
      type: 'object',
      required: ['archivo'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'Archivo .json, .csv, .xlsx o .xls (máximo 10 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Archivo parseado exitosamente. Revisar "errores" antes de confirmar el guardado.',
    type: PreviewCargaMasivaEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo no enviado, formato no soportado o JSON malformado.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Sin permiso para cargar preguntas.',
  })
  @RequiredPermission('bulk-upload', 'create')
  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: TAMANIO_MAXIMO_BYTES },
      fileFilter: (_req, file, callback) => {
        const ext = extraerExtension(file.originalname);
        const mimeValido = MIME_PERMITIDOS.has(file.mimetype);
        const extValida = EXTENSIONES_PERMITIDAS.has(ext);
        if (mimeValido && extValida) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Tipo de archivo no permitido: "${file.originalname}". ` +
                'Se aceptan archivos .json, .csv, .xlsx y .xls.',
            ),
            false,
          );
        }
      },
    }),
  )
  parsearArchivo(
    @UploadedFile() archivo: ArchivoMulter | undefined,
  ): PreviewCargaMasivaEntity {
    if (!archivo) {
      throw new BadRequestException(
        'No se recibió ningún archivo. Envíe el archivo en el campo "archivo".',
      );
    }

    return this.bulkUploadService.parsearArchivo(
      archivo.buffer,
      archivo.originalname,
      archivo.mimetype,
    );
  }
}
