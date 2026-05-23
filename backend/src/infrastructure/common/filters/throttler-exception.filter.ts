import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const retryAfterHeader = response.getHeader('Retry-After');

    const retryAfter =
      typeof retryAfterHeader === 'string'
        ? parseInt(retryAfterHeader, 10)
        : 60;

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: 429,
      error: 'rate_limit_exceeded',
      message: 'Demasiadas solicitudes',
      retryAfter,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
