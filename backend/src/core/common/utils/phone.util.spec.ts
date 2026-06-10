import { BadRequestException } from '@nestjs/common';
import { PhoneUtil } from './phone.util';

describe('PhoneUtil', () => {
  // ─── validateEcuadorian ────────────────────────────────────────────────────

  describe('validateEcuadorian', () => {
    it('formato +593 válido → no lanza', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('+593 987654321', 'telefono'),
      ).not.toThrow();
    });

    it('formato 09 válido → no lanza', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('0987654321', 'telefono'),
      ).not.toThrow();
    });

    it('formato 09 con espacios → no lanza', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('098 765 4321', 'telefono'),
      ).not.toThrow();
    });

    it('string vacío → BadRequestException', () => {
      expect(() => PhoneUtil.validateEcuadorian('', 'telefono')).toThrow(
        BadRequestException,
      );
    });

    it('número inicia diferente a +593 o 09 → BadRequestException', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('1234567890', 'telefono'),
      ).toThrow(BadRequestException);
    });

    it('+593 con dígitos incorrectos (no empieza con 9) → BadRequestException', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('+593 123456789', 'telefono'),
      ).toThrow(BadRequestException);
    });

    it('09 con menos de 10 dígitos → BadRequestException', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('098765432', 'telefono'),
      ).toThrow(BadRequestException);
    });

    it('09 con más de 10 dígitos → BadRequestException', () => {
      expect(() =>
        PhoneUtil.validateEcuadorian('09876543210', 'telefono'),
      ).toThrow(BadRequestException);
    });
  });

  // ─── validateAndClean ──────────────────────────────────────────────────────

  describe('validateAndClean', () => {
    it('teléfono con espacios → retorna limpio', () => {
      const result = PhoneUtil.validateAndClean('098 765 4321', 'telefono');
      expect(result).toBe('0987654321');
    });

    it('teléfono con guiones → retorna limpio', () => {
      const result = PhoneUtil.validateAndClean('098-765-4321', 'telefono');
      expect(result).toBe('0987654321');
    });

    it('teléfono inválido → BadRequestException', () => {
      expect(() => PhoneUtil.validateAndClean('12345', 'telefono')).toThrow(
        BadRequestException,
      );
    });
  });
});
