import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface FormattedValidationError {
  field: string;
  message?: string;
  constraints?: string[];
  children?: FormattedValidationError[];
}

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  errors?: string[] | FormattedValidationError[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errors: (string | ValidationError)[] | undefined;

    // Manejo de errores de validación (class-validator)
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse();

      status = HttpStatus.BAD_REQUEST;

      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        // Errors from ValidationPipe
        if (Array.isArray(exceptionResponse.message)) {
          message = 'Error de validación';
          errors = exceptionResponse.message as (string | ValidationError)[];
        } else {
          message = exceptionResponse.message as string;
        }
      } else {
        message = exception.message;
      }
    }
    // Manejo de otros errores HTTP
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        message = (exceptionResponse as any).message;
      } else {
        message = exception.message;
      }
    }
    // Errores no manejados (deberían ser 500)
    else if (exception instanceof Error) {
      // En desarrollo, mostrar el mensaje real
      // En producción, mostrar mensaje genérico
      message =
        process.env.NODE_ENV === 'development'
          ? exception.message
          : 'Error interno del servidor';

      // Log the error for debugging - in production this would go to the logger
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Unhandled error:', exception);
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Agregar errores de validación si existen
    if (errors && errors.length > 0) {
      // Si son strings (formato por defecto de ValidationPipe), los devolvemos directamente
      // Si son objetos ValidationError, los formateamos
      errorResponse.errors =
        typeof errors[0] === 'string'
          ? (errors as string[])
          : this.formatValidationErrors(errors as ValidationError[]);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Formatea los errores de validación para ser más legibles
   */
  private formatValidationErrors(
    errors: ValidationError[],
  ): FormattedValidationError[] {
    return errors.map((error) => {
      const formatted: FormattedValidationError = {
        field: error.property,
      };

      // Agregar las restricciones de validación
      if (error.constraints) {
        formatted.constraints = Object.values(error.constraints);
        // Primer constraint como mensaje principal
        formatted.message = Object.values(error.constraints)[0];
      }

      // Errores anidados (para objetos embebidos)
      if (error.children && error.children.length > 0) {
        formatted.children = this.formatValidationErrors(error.children);
      }

      return formatted;
    });
  }
}
