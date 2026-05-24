export const COLUMNAS_REQUERIDAS = [
  'texto',
  'opcion_a',
  'opcion_b',
  'opcion_c',
  'opcion_d',
  'correcta',
] as const;

export const LETRAS_VALIDAS = ['a', 'b', 'c', 'd'] as const;

export type LetraOpcion = (typeof LETRAS_VALIDAS)[number];

export function normalizarClave(clave: string): string {
  return clave.toLowerCase().trim().replace(/\s+/g, '_');
}

export function toStr(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean')
    return String(valor);
  return '';
}

export function normalizarLetra(valor: unknown): LetraOpcion | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const letra = String(valor).toLowerCase().trim();
  if ((LETRAS_VALIDAS as readonly string[]).includes(letra)) {
    return letra as LetraOpcion;
  }
  const mapaNumero: Record<string, LetraOpcion> = {
    '1': 'a',
    '2': 'b',
    '3': 'c',
    '4': 'd',
  };
  return mapaNumero[letra] ?? null;
}
