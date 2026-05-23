import { BadRequestException } from '@nestjs/common';

/**
 * Utilitario para validaciones comunes
 */
export class ValidationUtil {
  /**
   * Verifica que un string no esté vacío o solo contenga espacios
   * @param value - El valor a validar
   * @param fieldName - Nombre del campo para el mensaje de error
   * @throws BadRequestException si el valor está vacío o es solo espacios
   */
  static requireNonEmpty(
    value: string | null | undefined,
    fieldName: string,
  ): void {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede estar vacío`,
      );
    }
  }

  /**
   * Verifica que un string no tenga solo espacios (permitiendo null/undefined)
   * @param value - El valor a validar
   * @param fieldName - Nombre del campo para el mensaje de error
   * @throws BadRequestException si el valor tiene solo espacios
   */
  static requireNonWhitespace(
    value: string | null | undefined,
    fieldName: string,
  ): void {
    if (value !== null && value !== undefined && value.trim().length === 0) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede contener solo espacios`,
      );
    }
  }

  /**
   * Valida y limpia un string - lanza excepción si está vacío o solo espacios
   * @param value - El valor a validar
   * @param fieldName - Nombre del campo para el mensaje de error
   * @returns El valor limpio (trimmed)
   * @throws BadRequestException si el valor está vacío o es solo espacios
   */
  static validateAndTrim(
    value: string | null | undefined,
    fieldName: string,
  ): string {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede estar vacío`,
      );
    }
    return value.trim();
  }
}
