import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FileParserService } from './file-parser.service';

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileParserService);
  });

  describe('CSV parsing', () => {
    it('should parse CSV with option columns', async () => {
      const csv = `texto,categoria,nivel,monto,opcion1_texto,opcion1_esCorrecta,opcion2_texto,opcion2_esCorrecta
¿Capital de Francia?,Geografía,1,100,París,true,Londres,false
¿2+2?,Matemáticas,1,50,4,true,5,false`;
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(2);
      expect(result.preguntas[0].texto).toBe('¿Capital de Francia?');
      expect(result.preguntas[1].texto).toBe('¿2+2?');
      expect(result.preguntas[0].categoria).toBe('Geografía');
      expect(result.errores).toHaveLength(0);
    });

    it('should parse CSV with semicolon delimiter', async () => {
      const csv = `texto;categoria;opcion1_texto;opcion1_esCorrecta;opcion2_texto;opcion2_esCorrecta
"Pregunta A";Test;"Op A";true;"Op B";false
"Pregunta B";Test;"Op C";true;"Op D";false`;
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(2);
      expect(result.preguntas[0].texto).toBe('Pregunta A');
      expect(result.errores).toHaveLength(0);
    });

    it('should report errors for rows without texto', async () => {
      const csv = `texto,opcion1_texto,opcion1_esCorrecta
,Opción A,false`;
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(0);
      expect(result.errores.length).toBeGreaterThan(0);
      expect(result.errores[0].mensaje).toContain('texto requerido');
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON array of preguntas', async () => {
      const json = JSON.stringify([
        {
          texto: 'Pregunta 1',
          opciones: [
            { texto: 'A', esCorrecta: true },
            { texto: 'B', esCorrecta: false },
          ],
          categoria: 'Test',
        },
      ]);
      const file = new File([json], 'test.json', { type: 'application/json' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(1);
      expect(result.preguntas[0].texto).toBe('Pregunta 1');
      expect(result.errores).toHaveLength(0);
    });

    it('should parse JSON with preguntas wrapper', async () => {
      const json = JSON.stringify({
        preguntas: [
          {
            texto: 'P1',
            opciones: [
              { texto: 'A', esCorrecta: true },
              { texto: 'B', esCorrecta: false },
            ],
          },
        ],
      });
      const file = new File([json], 'data.json', { type: 'application/json' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(1);
      expect(result.preguntas[0].texto).toBe('P1');
    });

    it('should reject JSON without preguntas array', async () => {
      const json = JSON.stringify({ foo: 'bar' });
      const file = new File([json], 'test.json', { type: 'application/json' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(0);
      expect(result.errores.length).toBeGreaterThan(0);
    });
  });

  describe('Excel format (opcion_a, opcion_b + respuesta_correcta)', () => {
    it('should parse Excel-style headers with opcion_a letter format', async () => {
      const csv = `categoria,pregunta,respuesta_correcta,feedback_incorrecto,feedback_correcto,opcion_a,opcion_b,opcion_c,opcion_d
Plan de calidad,¿Cuál es una ventaja?,B,Feedback incorrecto,Feedback correcto,Texto A,Texto B,Texto C,Texto D`;
      const file = new File([csv], 'preguntas.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(1);
      expect(result.errores).toHaveLength(0);
      expect(result.preguntas[0].texto).toBe('¿Cuál es una ventaja?');
      expect(result.preguntas[0].opciones).toHaveLength(4);
      expect(result.preguntas[0].opciones[0].texto).toBe('Texto A');
      expect(result.preguntas[0].opciones[0].esCorrecta).toBe(false);
      expect(result.preguntas[0].opciones[1].texto).toBe('Texto B');
      expect(result.preguntas[0].opciones[1].esCorrecta).toBe(true);
      expect(result.preguntas[0].opciones[2].texto).toBe('Texto C');
      expect(result.preguntas[0].opciones[2].esCorrecta).toBe(false);
      expect(result.preguntas[0].categoria).toBe('Plan de calidad');
      expect(result.preguntas[0].feedbackCorrecto).toBe('Feedback correcto');
      expect(result.preguntas[0].feedbackIncorrecto).toBe('Feedback incorrecto');
    });

    it('should handle empty optional opciones (e, f, etc)', async () => {
      const csv = `pregunta,opcion_a,opcion_b,opcion_c,opcion_d,opcion_e,respuesta_correcta
¿Test?,A,B,C,D,,A`;
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(1);
      expect(result.preguntas[0].opciones).toHaveLength(4); // e skipped because empty
      expect(result.preguntas[0].opciones[0].esCorrecta).toBe(true);
    });

    it('should report error when no respuesta_correcta matches', async () => {
      const csv = `pregunta,opcion_a,opcion_b,respuesta_correcta
¿Test?,A,B,Z`;
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(0);
      expect(result.errores.length).toBeGreaterThan(0);
      expect(result.errores[0].mensaje).toContain('opción correcta');
    });
  });

  describe('unsupported format', () => {
    it('should return error for unsupported format', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = await service.parseFile(file);

      expect(result.total).toBe(0);
      expect(result.errores.length).toBeGreaterThan(0);
      expect(result.errores[0].mensaje).toContain('no soportado');
    });
  });
});
