import { BadRequestException } from '@nestjs/common';
import { ParseBigIntPipe } from './parse-bigint.pipe';

describe('ParseBigIntPipe', () => {
  let pipe: ParseBigIntPipe;

  beforeEach(() => {
    pipe = new ParseBigIntPipe();
  });

  it('convierte string numérico válido a BigInt', () => {
    const result = pipe.transform('123');
    expect(result).toBe(BigInt(123));
  });

  it('convierte ID grande a BigInt correctamente', () => {
    const result = pipe.transform('9007199254740993');
    expect(result).toBe(BigInt('9007199254740993'));
  });

  it('string no numérico → BadRequestException', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
  });

  it('string con letras mezcladas → BadRequestException', () => {
    expect(() => pipe.transform('12abc')).toThrow(BadRequestException);
  });

  it('string vacío → BadRequestException', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('número negativo → BadRequestException (guión no es dígito)', () => {
    expect(() => pipe.transform('-5')).toThrow(BadRequestException);
  });

  it('cero es válido → BigInt(0)', () => {
    const result = pipe.transform('0');
    expect(result).toBe(BigInt(0));
  });
});
