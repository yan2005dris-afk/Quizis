import { BadRequestException } from '@nestjs/common';
import { PhoneUtil } from './phone.util';

describe('PhoneUtil', () => {
  describe('validateAndClean', () => {
    it('should accept valid +593 format', () => {
      expect(() =>
        PhoneUtil.validateAndClean('+593991234567', 'telefono'),
      ).not.toThrow();
    });

    it('should accept valid 09 format', () => {
      expect(() =>
        PhoneUtil.validateAndClean('0991234567', 'telefono'),
      ).not.toThrow();
    });

    it('should throw BadRequestException for +593 without mobile prefix (9)', () => {
      expect(() =>
        PhoneUtil.validateAndClean('+593112345678', 'telefono'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for 09 format with wrong length', () => {
      expect(() =>
        PhoneUtil.validateAndClean('099123456', 'telefono'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-Ecuadorian format', () => {
      expect(() =>
        PhoneUtil.validateAndClean('+5491155555555', 'telefono'),
      ).toThrow(BadRequestException);
    });
  });
});
