import { BadRequestException } from '@nestjs/common';
import { ValidationUtil } from './validation.util';

describe('ValidationUtil', () => {
  // ─── requireNonEmpty ───────────────────────────────────────────────────────

  describe('requireNonEmpty', () => {
    it('string válido → no lanza', () => {
      expect(() => ValidationUtil.requireNonEmpty('Juan', 'nombre')).not.toThrow();
    });

    it('string vacío → BadRequestException con fieldName', () => {
      expect(() => ValidationUtil.requireNonEmpty('', 'nombre')).toThrow(
        BadRequestException,
      );
    });

    it('string solo espacios → BadRequestException', () => {
      expect(() => ValidationUtil.requireNonEmpty('   ', 'nombre')).toThrow(
        BadRequestException,
      );
    });

    it('null → BadRequestException', () => {
      expect(() => ValidationUtil.requireNonEmpty(null, 'nombre')).toThrow(
        BadRequestException,
      );
    });

    it('undefined → BadRequestException', () => {
      expect(() => ValidationUtil.requireNonEmpty(undefined, 'email')).toThrow(
        BadRequestException,
      );
    });
  });

  // ─── requireNonWhitespace ──────────────────────────────────────────────────

  describe('requireNonWhitespace', () => {
    it('string válido → no lanza', () => {
      expect(() =>
        ValidationUtil.requireNonWhitespace('valor', 'campo'),
      ).not.toThrow();
    });

    it('null → no lanza (es opcional)', () => {
      expect(() =>
        ValidationUtil.requireNonWhitespace(null, 'campo'),
      ).not.toThrow();
    });

    it('undefined → no lanza (es opcional)', () => {
      expect(() =>
        ValidationUtil.requireNonWhitespace(undefined, 'campo'),
      ).not.toThrow();
    });

    it('string solo espacios → BadRequestException', () => {
      expect(() =>
        ValidationUtil.requireNonWhitespace('   ', 'campo'),
      ).toThrow(BadRequestException);
    });
  });

  // ─── validateAndTrim ───────────────────────────────────────────────────────

  describe('validateAndTrim', () => {
    it('string con espacios → retorna trimmed', () => {
      expect(ValidationUtil.validateAndTrim('  hola  ', 'campo')).toBe('hola');
    });

    it('string vacío → BadRequestException', () => {
      expect(() => ValidationUtil.validateAndTrim('', 'campo')).toThrow(
        BadRequestException,
      );
    });

    it('string solo espacios → BadRequestException', () => {
      expect(() => ValidationUtil.validateAndTrim('   ', 'campo')).toThrow(
        BadRequestException,
      );
    });

    it('null → BadRequestException', () => {
      expect(() => ValidationUtil.validateAndTrim(null, 'campo')).toThrow(
        BadRequestException,
      );
    });

    it('string válido sin espacios → retorna tal cual', () => {
      expect(ValidationUtil.validateAndTrim('Juan', 'nombre')).toBe('Juan');
    });
  });
});
