import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { parsearJson } from 'src/games/bulk-upload/parsers/json.parser';
import { parsearCsv } from 'src/games/bulk-upload/parsers/csv.parser';
import { parsearExcel } from 'src/games/bulk-upload/parsers/excel.parser';
import type {
  FormatoArchivo,
  ResultadoParseo,
} from 'src/games/bulk-upload/types/bulk-upload.types';
import type { PreviewCargaMasivaEntity } from 'src/games/bulk-upload/entities/bulk-upload.entity';

const MIME_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const EXTENSION_FORMATO: Record<string, FormatoArchivo> = {
  '.json': 'json',
  '.csv': 'csv',
  '.xlsx': 'excel',
  '.xls': 'excel',
};

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  /**
   * Recibe el buffer del archivo subido, detecta su formato y lo parsea.
   * Devuelve un preview con las preguntas detectadas y los errores encontrados.
   * No persiste nada en base de datos.
   */
  parsearArchivo(
    buffer: Buffer,
    nombreArchivo: string,
    mimeType: string,
  ): PreviewCargaMasivaEntity {
    const formato = this.detectarFormato(nombreArchivo, mimeType);

    this.logger.log(
      `Parseando archivo "${nombreArchivo}" como formato "${formato}". Tamaño: ${buffer.length} bytes.`,
    );

    let resultado: ResultadoParseo;

    try {
      resultado = this.ejecutarParser(buffer, formato);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al procesar el archivo.';
      throw new BadRequestException(mensaje);
    }

    this.logger.log(
      `Parseo completado: ${resultado.preguntas.length} preguntas detectadas, ${resultado.errores.length} errores.`,
    );

    return {
      totalDetectadas: resultado.preguntas.length,
      totalErrores: resultado.errores.length,
      formato,
      preguntas: resultado.preguntas,
      errores: resultado.errores,
    };
  }

  private detectarFormato(
    nombreArchivo: string,
    mimeType: string,
  ): FormatoArchivo {
    const extension = this.extraerExtension(nombreArchivo);

    // Primero se prioriza la extensión del archivo
    if (extension && EXTENSION_FORMATO[extension]) {
      return EXTENSION_FORMATO[extension];
    }

    // Si no hay extensión reconocida, se usa el MIME type
    if (mimeType === 'application/json' || mimeType === 'text/json') {
      return 'json';
    }

    if (mimeType === 'text/csv' || mimeType === 'text/plain') {
      return 'csv';
    }

    if (MIME_EXCEL.includes(mimeType)) {
      return 'excel';
    }

    throw new BadRequestException(
      `Formato de archivo no soportado. Se aceptan: .json, .csv, .xlsx, .xls. ` +
        `Se recibió: "${nombreArchivo}" (${mimeType}).`,
    );
  }

  private extraerExtension(nombreArchivo: string): string | null {
    const match = nombreArchivo.toLowerCase().match(/(\.[a-z0-9]+)$/);
    return match ? match[1] : null;
  }

  private ejecutarParser(
    buffer: Buffer,
    formato: FormatoArchivo,
  ): ResultadoParseo {
    switch (formato) {
      case 'json':
        return parsearJson(buffer);
      case 'csv':
        return parsearCsv(buffer);
      case 'excel':
        return parsearExcel(buffer);
    }
  }
}
