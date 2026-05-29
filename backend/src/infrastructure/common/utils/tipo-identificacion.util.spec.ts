import { TipoIdentificacionUtil } from './tipo-identificacion.util';

describe('TipoIdentificacionUtil', () => {
  // ─── CÉDULA ────────────────────────────────────────────────────────────────

  describe('validar cédula (05 / CEDULA)', () => {
    it('cédula válida (código 05) → true', () => {
      // Cédula de prueba con dígito verificador correcto
      expect(TipoIdentificacionUtil.validar('05', '1713175071')).toBe(true);
    });

    it('cédula válida (código CEDULA) → true', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '1713175071')).toBe(true);
    });

    it('cédula con caracteres no numéricos → false', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '171317507A')).toBe(false);
    });

    it('cédula con menos de 10 dígitos → false', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '123456789')).toBe(false);
    });

    it('cédula con más de 10 dígitos → false', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '12345678901')).toBe(false);
    });

    it('cédula con provincia inválida (00) → false', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '0013175071')).toBe(false);
    });

    it('cédula con dígito verificador incorrecto → false', () => {
      expect(TipoIdentificacionUtil.validar('CEDULA', '1713175079')).toBe(false);
    });
  });

  // ─── PASAPORTE ─────────────────────────────────────────────────────────────

  describe('validar pasaporte (06 / PASAPORTE)', () => {
    it('pasaporte alfanumérico válido → true', () => {
      expect(TipoIdentificacionUtil.validar('06', 'ABC123456')).toBe(true);
    });

    it('pasaporte código PASAPORTE → true', () => {
      expect(TipoIdentificacionUtil.validar('PASAPORTE', 'P1234567')).toBe(true);
    });

    it('pasaporte demasiado corto (< 6 chars) → false', () => {
      expect(TipoIdentificacionUtil.validar('PASAPORTE', 'AB123')).toBe(false);
    });

    it('pasaporte muy largo (> 15 chars) → false', () => {
      expect(
        TipoIdentificacionUtil.validar('PASAPORTE', 'A'.repeat(16)),
      ).toBe(false);
    });
  });

  // ─── IDENTIFICACIÓN EXTRANJERA ─────────────────────────────────────────────

  describe('validar identificación extranjera (08 / IDENTIFICACION_EXTRANJERA)', () => {
    it('documento con 6+ caracteres → true', () => {
      expect(
        TipoIdentificacionUtil.validar('08', 'FOREIGN123'),
      ).toBe(true);
    });

    it('código IDENTIFICACION_EXTRANJERA → true', () => {
      expect(
        TipoIdentificacionUtil.validar('IDENTIFICACION_EXTRANJERA', 'FOR001'),
      ).toBe(true);
    });

    it('documento con menos de 6 caracteres → false', () => {
      expect(TipoIdentificacionUtil.validar('08', 'AB12')).toBe(false);
    });
  });

  // ─── CONSUMIDOR FINAL ──────────────────────────────────────────────────────

  describe('validar consumidor final (07 / CONSUMIDOR_FINAL)', () => {
    it('cualquier valor → true (consumidor final siempre válido)', () => {
      expect(TipoIdentificacionUtil.validar('07', 'cualquier-valor')).toBe(true);
      expect(TipoIdentificacionUtil.validar('CONSUMIDOR_FINAL', '')).toBe(true);
    });
  });

  // ─── TIPO DESCONOCIDO ──────────────────────────────────────────────────────

  describe('tipo desconocido', () => {
    it('código desconocido → false', () => {
      expect(TipoIdentificacionUtil.validar('99', '1713175071')).toBe(false);
    });
  });
});
