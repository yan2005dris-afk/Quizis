import { BadRequestException } from '@nestjs/common';
import { RequiredStringPipe } from './required-string.pipe';

describe('RequiredStringPipe', () => {
  let pipe: RequiredStringPipe;

  beforeEach(() => {
    pipe = new RequiredStringPipe('nickname');
  });

  it('string válido → lo retorna tal cual', () => {
    expect(pipe.transform('Juan')).toBe('Juan');
  });

  it('string con espacios internos → lo retorna tal cual', () => {
    expect(pipe.transform('Juan Perez')).toBe('Juan Perez');
  });

  it('string vacío → BadRequestException con fieldName', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('string solo espacios → BadRequestException', () => {
    expect(() => pipe.transform('   ')).toThrow(BadRequestException);
  });

  it('null → BadRequestException', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it('undefined → BadRequestException', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('número → BadRequestException (no es string)', () => {
    expect(() => pipe.transform(123)).toThrow(BadRequestException);
  });

  it('mensaje de error incluye el fieldName', () => {
    try {
      pipe.transform('');
    } catch (e) {
      expect((e as BadRequestException).message).toContain('nickname');
    }
  });
});
