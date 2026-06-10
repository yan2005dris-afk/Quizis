import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { BigIntInterceptor } from './bigint.interceptor';

describe('BigIntInterceptor', () => {
  let interceptor: BigIntInterceptor;

  const mockContext = {} as ExecutionContext;

  function makeHandler(data: unknown): CallHandler {
    return { handle: () => of(data) };
  }

  beforeEach(() => {
    interceptor = new BigIntInterceptor();
  });

  it('convierte BigInt a string', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ id: BigInt(123) })),
    );
    expect(result.id).toBe('123');
  });

  it('convierte BigInt grande correctamente', async () => {
    const big = BigInt('9007199254740993');
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ value: big })),
    );
    expect(result.value).toBe('9007199254740993');
  });

  it('deja strings sin modificar', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ name: 'Juan' })),
    );
    expect(result.name).toBe('Juan');
  });

  it('deja números normales sin modificar', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ count: 42 })),
    );
    expect(result.count).toBe(42);
  });

  it('deja Date sin modificar', async () => {
    const date = new Date('2024-01-01');
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler({ createdAt: date })),
    );
    expect(result.createdAt).toEqual(date);
  });

  it('convierte BigInt en arrays anidados', async () => {
    const data = { items: [{ id: BigInt(1) }, { id: BigInt(2) }] };
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler(data)),
    );
    expect(result.items[0].id).toBe('1');
    expect(result.items[1].id).toBe('2');
  });

  it('convierte BigInt en objetos profundamente anidados', async () => {
    const data = { a: { b: { id: BigInt(99) } } };
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, makeHandler(data)),
    );
    expect(result.a.b.id).toBe('99');
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
});
