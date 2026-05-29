import { requireEnv, optionalEnv, resolveDir } from './env.utils';
import { resolve } from 'path';

describe('env.utils', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, ORIGINAL_ENV);
    // Eliminar variables añadidas en tests
    Object.keys(process.env)
      .filter((k) => !ORIGINAL_ENV[k])
      .forEach((k) => delete process.env[k]);
  });

  // ─── requireEnv ────────────────────────────────────────────────────────────

  describe('requireEnv', () => {
    it('variable definida → retorna su valor', () => {
      process.env.TEST_VAR = 'test-value';
      expect(requireEnv('TEST_VAR')).toBe('test-value');
    });

    it('variable no definida → lanza Error', () => {
      delete process.env.MISSING_VAR;
      expect(() => requireEnv('MISSING_VAR')).toThrow(Error);
    });

    it('mensaje de error incluye el nombre de la variable', () => {
      delete process.env.MY_SECRET;
      expect(() => requireEnv('MY_SECRET')).toThrow('MY_SECRET');
    });
  });

  // ─── optionalEnv ───────────────────────────────────────────────────────────

  describe('optionalEnv', () => {
    it('variable definida → retorna su valor', () => {
      process.env.OPT_VAR = 'defined-value';
      expect(optionalEnv('OPT_VAR', 'fallback')).toBe('defined-value');
    });

    it('variable no definida → retorna fallback', () => {
      delete process.env.NOT_SET;
      expect(optionalEnv('NOT_SET', 'default-val')).toBe('default-val');
    });
  });

  // ─── resolveDir ────────────────────────────────────────────────────────────

  describe('resolveDir', () => {
    it('path absoluto → lo retorna tal cual', () => {
      expect(resolveDir('/absolute/path')).toBe('/absolute/path');
    });

    it('path relativo → lo resuelve desde cwd', () => {
      const result = resolveDir('uploads');
      expect(result).toBe(resolve(process.cwd(), 'uploads'));
    });

    it('path con separador Windows (contiene :) → lo retorna tal cual', () => {
      const winPath = 'C:/Users/test';
      expect(resolveDir(winPath)).toBe(winPath);
    });
  });
});
