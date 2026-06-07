import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { PreguntaDto, OpcionDto } from '../models/parse-response';

export interface ParseError {
  fila: number;
  mensaje: string;
  campo?: string;
}

export interface ParseResult {
  preguntas: PreguntaDto[];
  errores: ParseError[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class FileParserService {
  parseFile(file: File): Promise<ParseResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'csv') return this.parseCsv(file);
    if (ext === 'xlsx' || ext === 'xls') return this.parseExcel(file);
    if (ext === 'json') return this.parseJson(file);

    return Promise.resolve({
      preguntas: [],
      errores: [{ fila: 0, mensaje: `Formato no soportado: .${ext}. Usá CSV, Excel o JSON.` }],
      total: 0,
    });
  }

  private parseCsv(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        Papa.parse<string[]>(text, {
          complete: (results: Papa.ParseResult<string[]>) => {
            if (results.errors.length > 0 && results.data.length === 0) {
              resolve({
                preguntas: [],
                errores: [{ fila: 0, mensaje: 'No se pudieron leer datos del CSV.' }],
                total: 0,
              });
              return;
            }

            const headers = results.data[0] as string[];
            const rows = results.data
              .slice(1)
              .filter((r: string[]) => r.some((c) => c.trim() !== ''));
            const result = this.rowsToPreguntas(headers, rows);
            resolve(result);
          },
          error: (err: Error) => {
            reject(new Error(`Error al leer CSV: ${err.message}`));
          },
          delimiter: '',
          encoding: 'UTF-8',
          preview: 0,
        });
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo CSV.'));
      reader.readAsText(file);
    });
  }

  private parseExcel(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            resolve({
              preguntas: [],
              errores: [{ fila: 0, mensaje: 'El archivo Excel no contiene hojas.' }],
              total: 0,
            });
            return;
          }
          const sheet = workbook.Sheets[sheetName];
          const jsonData: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
          });

          if (jsonData.length === 0) {
            resolve({ preguntas: [], errores: [], total: 0 });
            return;
          }

          const headers = Object.keys(jsonData[0]);
          const rows = jsonData.map((row) => headers.map((h) => row[h] ?? ''));
          const result = this.rowsToPreguntas(headers, rows);
          resolve(result);
        } catch (err) {
          reject(new Error(`Error al parsear Excel: ${(err as Error).message}`));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  }

  private parseJson(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = JSON.parse(reader.result as string);
          const arrayResult = this.extractPreguntasArray(content);

          if ('mensaje' in arrayResult) {
            resolve({ preguntas: [], errores: [arrayResult], total: 0 });
            return;
          }

          const preguntas: PreguntaDto[] = [];
          const errores: ParseError[] = [];

          arrayResult.forEach((raw, i) => {
            const result = this.mapJsonRow(raw as Record<string, unknown>, i + 1);
            if ('mensaje' in result) {
              errores.push(result);
            } else {
              preguntas.push(result);
            }
          });

          resolve({ preguntas, errores, total: preguntas.length });
        } catch {
          resolve({
            preguntas: [],
            errores: [{ fila: 0, mensaje: 'El archivo JSON no es válido.' }],
            total: 0,
          });
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file);
    });
  }

  /**
   * Extrae el array de preguntas desde distintas estructuras JSON.
   * Soporta array directo o { preguntas: [...] }.
   * Retorna el array si es válido, o un ParseError en caso contrario.
   */
  private extractPreguntasArray(content: unknown): unknown[] | ParseError {
    if (Array.isArray(content)) return content;

    const obj = content as Record<string, unknown>;
    if (obj['preguntas'] && Array.isArray(obj['preguntas'])) return obj['preguntas'];

    return { fila: 0, mensaje: 'El JSON no contiene un array de preguntas.' };
  }

  /**
   * Mapea una fila JSON cruda a PreguntaDto validado, o retorna un ParseError.
   */
  private mapJsonRow(raw: Record<string, unknown>, fila: number): PreguntaDto | ParseError {
    const texto = raw['texto'] as string | undefined;
    const opcionesRaw = raw['opciones'] as unknown[] | undefined;

    const fieldErrors: string[] = [];
    if (!texto || typeof texto !== 'string') fieldErrors.push('texto requerido');
    if (!Array.isArray(opcionesRaw) || opcionesRaw.length < 2)
      fieldErrors.push('opciones requeridas (mín. 2)');

    if (fieldErrors.length > 0) {
      return { fila, mensaje: fieldErrors.join(', ') };
    }

    const opciones: OpcionDto[] = opcionesRaw!.map((o) => {
      const opt = o as Record<string, unknown>;
      return {
        texto: String(opt['texto'] ?? ''),
        esCorrecta: Boolean(opt['esCorrecta']),
      };
    });

    if (!opciones.some((o) => o.esCorrecta)) {
      return { fila, mensaje: 'Debe haber exactamente una opción correcta' };
    }

    return {
      texto: texto!,
      opciones,
      categoria: raw['categoria'] as string | undefined,
      nivel: raw['nivel'] as number | undefined,
      monto: raw['monto'] as number | undefined,
      feedbackCorrecto: raw['feedbackCorrecto'] as string | undefined,
      feedbackIncorrecto: raw['feedbackIncorrecto'] as string | undefined,
      tiempoLimite: raw['tiempoLimite'] as number | undefined,
    };
  }

  // ── Tabular parsing (CSV / Excel) ─────────────────────

  private rowsToPreguntas(headers: string[], rows: string[][]): ParseResult {
    const preguntas: PreguntaDto[] = [];
    const errores: ParseError[] = [];
    const headerMap = this.detectColumnMapping(headers);

    // Detect format: does it use opcion_{letter} (e.g. opcion_a) or opcion{N} (e.g. opcion1)?
    const usesLetterOptions = headers.some((h) => /^opcion_[a-z]$/i.test(h.trim()));

    rows.forEach((row, i) => {
      const fila = i + 1;
      const texto =
        this.getCell(row, headerMap, 'pregunta') || this.getCell(row, headerMap, 'texto');
      const fieldErrors: string[] = [];

      if (!texto) fieldErrors.push('texto requerido');

      const opciones = usesLetterOptions
        ? this.extractLetterOptions(row, headers)
        : this.extractNumberedOptions(row, headers);

      if (opciones.length < 2) fieldErrors.push('Se necesitan al menos 2 opciones');

      if (fieldErrors.length > 0) {
        errores.push({ fila, mensaje: fieldErrors.join(', ') });
        return;
      }

      const hasCorrecta = opciones.some((o) => o.esCorrecta);
      if (!hasCorrecta) {
        errores.push({ fila, mensaje: 'Debe haber exactamente una opción correcta' });
        return;
      }

      preguntas.push({
        texto: texto!,
        opciones,
        categoria: this.getCell(row, headerMap, 'categoria') || undefined,
        nivel: Number(this.getCell(row, headerMap, 'nivel')) || undefined,
        monto: Number(this.getCell(row, headerMap, 'monto')) || undefined,
        feedbackCorrecto:
          this.getCell(row, headerMap, 'feedbackCorrecto') ||
          this.getCell(row, headerMap, 'feedback_correcto') ||
          undefined,
        feedbackIncorrecto:
          this.getCell(row, headerMap, 'feedbackIncorrecto') ||
          this.getCell(row, headerMap, 'feedback_incorrecto') ||
          undefined,
      });
    });

    return { preguntas, errores, total: preguntas.length };
  }

  private detectColumnMapping(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    const aliases: Record<string, string[]> = {
      texto: ['texto', 'pregunta'],
      categoria: ['categoria', 'categoría'],
      nivel: ['nivel'],
      monto: ['monto'],
      feedbackCorrecto: ['feedbackcorrecto', 'feedback_correcto', 'feedback correcto'],
      feedbackIncorrecto: ['feedbackincorrecto', 'feedback_incorrecto', 'feedback incorrecto'],
    };

    for (const [field, names] of Object.entries(aliases)) {
      const idx = lowerHeaders.findIndex((h) => names.includes(h));
      if (idx >= 0) map.set(field, idx);
    }

    return map;
  }

  private getCell(row: string[], map: Map<string, number>, field: string): string {
    const idx = map.get(field);
    if (idx === undefined || idx >= row.length) return '';
    return (row[idx] ?? '').trim();
  }

  /** Format: opcion_a, opcion_b, opcion_c + respuesta_correcta (letter) */
  private extractLetterOptions(row: string[], headers: string[]): OpcionDto[] {
    const options: { letter: string; texto: string }[] = [];
    let correctLetter = '';

    headers.forEach((header, colIdx) => {
      const lower = header.toLowerCase().trim();
      const match = lower.match(/^opcion_([a-z])$/);
      if (match) {
        const letter = match[1];
        const value = (row[colIdx] ?? '').trim();
        if (value) {
          options.push({ letter, texto: value });
        }
      }
      if (lower === 'respuesta_correcta' || lower === 'respuestacorrecta') {
        correctLetter = (row[colIdx] ?? '').trim().toLowerCase();
      }
    });

    return options.map((opt) => ({
      texto: opt.texto,
      esCorrecta: opt.letter === correctLetter,
    }));
  }

  /** Format: opcion1_texto, opcion1_esCorrecta, opcion2_texto, opcion2_esCorrecta */
  private extractNumberedOptions(row: string[], headers: string[]): OpcionDto[] {
    const optionGroups = new Map<number, { texto: string; esCorrecta: boolean }>();

    headers.forEach((header, colIdx) => {
      const lower = header.toLowerCase().trim();
      const match = lower.match(/^opcion(\d+)(?:_(texto|escorrecta))?$/);
      if (!match) return;

      const num = parseInt(match[1], 10);
      const field = match[2];

      if (!optionGroups.has(num)) {
        optionGroups.set(num, { texto: '', esCorrecta: false });
      }

      const group = optionGroups.get(num)!;
      const value = (row[colIdx] ?? '').trim();

      if (!field || field === 'texto') {
        group.texto = value;
      } else if (field === 'escorrecta') {
        group.esCorrecta =
          value.toLowerCase() === 'true' || value === '1' || value === 'sí' || value === 'si';
      }
    });

    const options: OpcionDto[] = [];
    for (const [, opt] of optionGroups) {
      if (opt.texto) options.push(opt);
    }
    return options;
  }
}
