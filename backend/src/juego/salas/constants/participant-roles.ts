/**
 * Roles canónicos de un participante en la sala.
 *
 * Estos valores se persisten en la DB (columna `rol` de la tabla `participantes`)
 * y se usan en toda la lógica de negocio del módulo de juego.
 */
export enum RolParticipante {
  ESTUDIANTE = 'estudiante',
  OBSERVADOR = 'observador',
}

/**
 * Label del host/admin que se usa como prefijo en el nickname
 * para identificarlo en la lista de participantes.
 */
export const HOST_NICKNAME_PREFIX = 'Host-';

/**
 * Helper: determina si un nickname pertenece al host.
 */
export function isHostNickname(nickname: string): boolean {
  return nickname.startsWith(HOST_NICKNAME_PREFIX);
}
