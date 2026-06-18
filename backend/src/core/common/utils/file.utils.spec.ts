import {
  formatFileSize,
  sanitizeFilename,
  generateUniqueFilename,
  getFileNameWithoutExt,
  hasValidExtension,
} from './file.utils';

describe('file.utils', () => {
  // ─── formatFileSize ────────────────────────────────────────────────────────

  describe('formatFileSize', () => {
    it('0 bytes → "0 Bytes"', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('1024 bytes → "1 KB"', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('1048576 bytes → "1 MB"', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('1536 bytes → "1.5 KB"', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('500 bytes → "500 Bytes"', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });
  });

  // ─── sanitizeFilename ──────────────────────────────────────────────────────

  describe('sanitizeFilename', () => {
    it('nombre con espacios → guiones bajos', () => {
      expect(sanitizeFilename('mi archivo.txt')).toBe('mi_archivo.txt');
    });

    it('nombre con acentos → caracteres normales', () => {
      expect(sanitizeFilename('exámen.pdf')).toBe('examen.pdf');
    });

    it('ñ → n', () => {
      expect(sanitizeFilename('niño.jpg')).toBe('nino.jpg');
    });

    it('extensión en mayúsculas → minúsculas', () => {
      expect(sanitizeFilename('foto.JPG')).toBe('foto.jpg');
    });

    it('caracteres especiales eliminados', () => {
      const result = sanitizeFilename('arch!vo@#.txt');
      expect(result).not.toContain('!');
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
    });

    it('múltiples guiones bajos reducidos a uno', () => {
      const result = sanitizeFilename('mi   archivo.txt');
      expect(result).not.toContain('__');
    });
  });

  // ─── generateUniqueFilename ────────────────────────────────────────────────

  describe('generateUniqueFilename', () => {
    it('incluye timestamp en el nombre', () => {
      const before = Date.now();
      const result = generateUniqueFilename('foto.jpg');
      const after = Date.now();

      const parts = result.split('_');
      const ts = parseInt(parts[0]);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('con prefix → nombre tiene prefix al inicio', () => {
      const result = generateUniqueFilename('foto.jpg', 'usuario');
      expect(result).toMatch(/^usuario_/);
    });

    it('sin prefix → nombre empieza con timestamp', () => {
      const result = generateUniqueFilename('foto.jpg');
      expect(result).toMatch(/^\d+_/);
    });
  });

  // ─── getFileNameWithoutExt ─────────────────────────────────────────────────

  describe('getFileNameWithoutExt', () => {
    it('archivo con extensión → nombre sin extensión', () => {
      expect(getFileNameWithoutExt('foto.jpg')).toBe('foto');
    });

    it('archivo sin extensión → nombre completo', () => {
      expect(getFileNameWithoutExt('Makefile')).toBe('Makefile');
    });

    it('archivo con punto en nombre → solo quita última extensión', () => {
      expect(getFileNameWithoutExt('archivo.backup.tar')).toBe(
        'archivo.backup',
      );
    });
  });

  // ─── hasValidExtension ─────────────────────────────────────────────────────

  describe('hasValidExtension', () => {
    it('extensión válida → true', () => {
      expect(hasValidExtension('foto.jpg', ['.jpg', '.png'])).toBe(true);
    });

    it('extensión inválida → false', () => {
      expect(hasValidExtension('virus.exe', ['.jpg', '.png'])).toBe(false);
    });

    it('extensión en mayúsculas → case-insensitive (minúsculas en comprobación)', () => {
      expect(hasValidExtension('foto.JPG', ['.jpg'])).toBe(true);
    });
  });
});
