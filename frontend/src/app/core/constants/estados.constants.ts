/**
 * Estados canónicos de una sala de juego.
 *
 * Estos valores deben coincidir con el enum `EstadoSala` del backend
 * (`backend/src/juego/salas/dto/update-estado-sala.dto.ts`).
 *
 * ## Ciclo de vida
 * BORRADOR → ESPERANDO_ALUMNOS → EN_VIVO → FINALIZADO
 *
 * ## Mapeo para frontend
 * El backend mapea estos valores a términos semánticos en `ListAllSalasUseCase`:
 * - EN_VIVO → 'jugando'
 * - ESPERANDO_ALUMNOS → 'esperando'
 * - BORRADOR → 'borrador'
 * - FINALIZADO → 'terminado'
 */
export const ESTADOS_SALA = {
  BORRADOR: 'BORRADOR' as const,
  ESPERANDO_ALUMNOS: 'ESPERANDO_ALUMNOS' as const,
  EN_VIVO: 'EN_VIVO' as const,
  FINALIZADO: 'FINALIZADO' as const,
} as const;

/** Unión de todos los estados de sala */
export type EstadoSala = (typeof ESTADOS_SALA)[keyof typeof ESTADOS_SALA];

/** Mapeo a etiquetas legibles en español */
export const ESTADO_ETIQUETAS: Record<EstadoSala, string> = {
  [ESTADOS_SALA.BORRADOR]: 'Borrador',
  [ESTADOS_SALA.ESPERANDO_ALUMNOS]: 'Esperando alumnos',
  [ESTADOS_SALA.EN_VIVO]: 'En vivo',
  [ESTADOS_SALA.FINALIZADO]: 'Finalizado',
};

/** Estados desde los que se puede finalizar una sala */
export const ESTADOS_FINALIZABLES: EstadoSala[] = [
  ESTADOS_SALA.BORRADOR,
  ESTADOS_SALA.ESPERANDO_ALUMNOS,
  ESTADOS_SALA.EN_VIVO,
];

/** Estados desde los que se puede editar la configuración */
export const ESTADOS_EDITABLES: EstadoSala[] = [
  ESTADOS_SALA.BORRADOR,
  ESTADOS_SALA.ESPERANDO_ALUMNOS,
];

/** Mapeo de estados de backend a valores semánticos para el listado de salas */
export const ESTADO_MAPEO_BACKEND: Record<string, string> = {
  [ESTADOS_SALA.EN_VIVO]: 'jugando',
  [ESTADOS_SALA.ESPERANDO_ALUMNOS]: 'esperando',
  [ESTADOS_SALA.BORRADOR]: 'borrador',
  [ESTADOS_SALA.FINALIZADO]: 'terminado',
};

/* ══════════════════════════════════════════════════
   ROLES DE PARTICIPANTES
   ══════════════════════════════════════════════════ */

/** Roles canónicos de un participante en la sala */
export const ROLES_PARTICIPANTE = {
  ESTUDIANTE: 'estudiante' as const,
  OBSERVADOR: 'observador' as const,
  ADMIN: 'admin' as const,
} as const;

/** Unión de todos los roles de participante */
export type RolParticipante = (typeof ROLES_PARTICIPANTE)[keyof typeof ROLES_PARTICIPANTE];

/** Etiquetas legibles para cada rol */
export const ROL_ETIQUETAS: Record<RolParticipante, string> = {
  [ROLES_PARTICIPANTE.ESTUDIANTE]: 'Estudiante',
  [ROLES_PARTICIPANTE.OBSERVADOR]: 'Observador',
  [ROLES_PARTICIPANTE.ADMIN]: 'Admin',
};
