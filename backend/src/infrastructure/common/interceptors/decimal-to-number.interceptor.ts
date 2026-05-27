import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function transformDecimals(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformDecimals(item));
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Detectar si es un Decimal de Prisma (tipo objeto con propiedad _isDecimal o similar)
      if (value !== null && typeof value === 'object') {
        // Los Decimals de Prisma se pueden convertir con Number()
        if (
          value.constructor?.name === 'Decimal' ||
          (value as any)._isDecimal
        ) {
          result[key] = Number(value);
          continue;
        }
        // También verificar por el formato específico de Prisma
        if ((value as any).d !== undefined && (value as any).e !== undefined) {
          result[key] = Number(value);
          continue;
        }
      }
      result[key] = transformDecimals(value);
    }
    return result;
  }

  return obj;
}

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => transformDecimals(data)));
  }
}
