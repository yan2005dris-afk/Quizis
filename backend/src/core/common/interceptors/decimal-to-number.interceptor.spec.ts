import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { DecimalToNumberInterceptor } from './decimal-to-number.interceptor';

describe('DecimalToNumberInterceptor', () => {
  let interceptor: DecimalToNumberInterceptor;

  const mockContext = {} as ExecutionContext;

  function makeHandler(data: unknown): CallHandler {
    return { handle: () => of(data) };
  }

  beforeEach(() => {
    interceptor = new DecimalToNumberInterceptor();
  });

  it('deja strings sin modificar', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ name: 'test' })),
    );
    expect(result.name).toBe('test');
  });

  it('deja números sin modificar', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ count: 5 })),
    );
    expect(result.count).toBe(5);
  });

  it('deja Date sin modificar', async () => {
    const date = new Date('2024-01-01');
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ date })),
    );
    expect(result.date).toEqual(date);
  });

  it('convierte objeto con constructor Decimal (_isDecimal) a Number', async () => {
    const mockDecimal = {
      _isDecimal: true,
      toString: () => '3.14',
      valueOf: () => 3.14,
      [Symbol.toPrimitive]: () => 3.14,
      constructor: { name: 'Decimal' },
    };
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ price: mockDecimal })),
    );
    expect(typeof result.price).toBe('number');
  });

  it('convierte objeto con constructor.name Decimal a Number', async () => {
    class Decimal {
      valueOf() {
        return 9.99;
      }
    }
    const decimal = new Decimal();
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ price: decimal })),
    );
    expect(typeof result.price).toBe('number');
  });

  it('null retorna null', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler(null)),
    );
    expect(result).toBeNull();
  });

  it('undefined retorna undefined', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler(undefined)),
    );
    expect(result).toBeUndefined();
  });

  it('array de objetos procesado recursivamente', async () => {
    const data = [{ value: 'a' }, { value: 'b' }];
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler(data)),
    );
    expect(result).toEqual(data);
  });
});
