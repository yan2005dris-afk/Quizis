import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    return next.handle().pipe(map((data: unknown) => this.convertBigInt(data)));
  }

  private convertBigInt(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.convertBigInt(item));
    }

    if (typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const converted: Record<string, unknown> = {};

      for (const key of Object.keys(source)) {
        converted[key] = this.convertBigInt(source[key]);
      }

      return converted;
    }

    return value;
  }
}
