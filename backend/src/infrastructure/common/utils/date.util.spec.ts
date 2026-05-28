import { DateUtil } from './date.util';

describe('DateUtil', () => {
  // ─── parseFrontendDate ─────────────────────────────────────────────────────

  describe('parseFrontendDate', () => {
    it('formato yyyy-MM-dd → Date válido', () => {
      const result = DateUtil.parseFrontendDate('2024-05-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('formato dd/MM/yyyy → Date válido', () => {
      const result = DateUtil.parseFrontendDate('15/05/2024');
      expect(result).toBeInstanceOf(Date);
    });

    it('formato dd-MM-yyyy → Date válido', () => {
      const result = DateUtil.parseFrontendDate('15-05-2024');
      expect(result).toBeInstanceOf(Date);
    });

    it('Date válido como input → lo retorna directamente', () => {
      const input = new Date('2024-05-15');
      const result = DateUtil.parseFrontendDate(input);
      expect(result).toBe(input);
    });

    it('null → retorna null', () => {
      expect(DateUtil.parseFrontendDate(null)).toBeNull();
    });

    it('undefined → retorna null', () => {
      expect(DateUtil.parseFrontendDate(undefined)).toBeNull();
    });

    it('string inválido → retorna null', () => {
      expect(DateUtil.parseFrontendDate('not-a-date')).toBeNull();
    });
  });

  // ─── parseFrontendDateStrict ───────────────────────────────────────────────

  describe('parseFrontendDateStrict', () => {
    it('fecha válida → retorna Date', () => {
      const result = DateUtil.parseFrontendDateStrict('2024-05-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('string inválido → lanza Error', () => {
      expect(() => DateUtil.parseFrontendDateStrict('no-es-fecha')).toThrow(
        Error,
      );
    });

    it('null → lanza Error', () => {
      expect(() => DateUtil.parseFrontendDateStrict(null)).toThrow(Error);
    });
  });

  // ─── formatForFrontend ─────────────────────────────────────────────────────

  describe('formatForFrontend', () => {
    it('Date válido → formato YYYY-MM-DD', () => {
      const result = DateUtil.formatForFrontend(new Date(2024, 4, 15)); // mes 4 = mayo
      expect(result).toBe('2024-05-15');
    });

    it('null → retorna null', () => {
      expect(DateUtil.formatForFrontend(null)).toBeNull();
    });

    it('undefined → retorna null', () => {
      expect(DateUtil.formatForFrontend(undefined)).toBeNull();
    });
  });

  // ─── isValidFrontendDate ───────────────────────────────────────────────────

  describe('isValidFrontendDate', () => {
    it('fecha válida → true', () => {
      expect(DateUtil.isValidFrontendDate('2024-05-15')).toBe(true);
    });

    it('string inválido → false', () => {
      expect(DateUtil.isValidFrontendDate('abc-xyz')).toBe(false);
    });
  });
});
