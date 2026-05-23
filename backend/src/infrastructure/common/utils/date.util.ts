import { parse, isValid } from 'date-fns';

/**
 * Utilitario para parsing y formateo de fechas
 * Maneja formatos comunes del frontend
 */
export class DateUtil {
  /**
   * Formatos aceptados del frontend
   */
  private static readonly PARSE_FORMATS = [
    'yyyy-MM-dd', // 2026-05-03
    'dd-MM-yyyy', // 03-05-2026
    'dd/MM/yyyy', // 03/05/2026
    'yyyy/MM/dd', // 2026/05/03
    'MM-dd-yyyy', // 05-03-2026
    'MM/dd/yyyy', // 05/03/2026
  ] as const;

  /**
   * Parsea una fecha desde el frontend (string) a Date para Prisma/DB
   * @param value Fecha en formato string desde el frontend
   * @returns Date válido o null si no se puede parsear
   * @throws Error si el formato no es válido
   */
  public static parseFrontendDate(
    value: string | Date | null | undefined,
  ): Date | null {
    // Si ya es Date, retornarlo directamente
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }

    // Si es null/undefined, retornar null
    if (!value) {
      return null;
    }

    // Si es string, intentar parsear
    const trimmed = value.trim();

    // Intentar con cada formato
    for (const format of this.PARSE_FORMATS) {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    }

    // Como último recurso, intentar con el constructor de Date nativo
    const nativeParsed = new Date(value);
    if (isValid(nativeParsed)) {
      return nativeParsed;
    }

    // No se pudo parsear
    return null;
  }

  /**
   * Parsea una fecha con validación throwing
   * @param value Fecha en formato string desde el frontend
   * @returns Date válido
   * @throws Error si el formato no es válido
   */
  public static parseFrontendDateStrict(
    value: string | Date | null | undefined,
  ): Date {
    const parsed = this.parseFrontendDate(value);
    if (!parsed) {
      const valueStr = typeof value === 'string' ? value : String(value);
      throw new Error(`Fecha inválida: ${valueStr}`);
    }
    return parsed;
  }

  /**
   * Formatea una fecha para el frontend (YYYY-MM-DD)
   * @param date Fecha a formatear
   * @returns String en formato YYYY-MM-DD
   */
  public static formatForFrontend(
    date: Date | null | undefined,
  ): string | null {
    if (!date || !isValid(date)) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Valida si una fecha string es válida
   * @param value Fecha en formato string
   * @returns true si es válida
   */
  public static isValidFrontendDate(value: string): boolean {
    return this.parseFrontendDate(value) !== null;
  }
}
