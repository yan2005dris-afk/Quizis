const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const TRUST_PROXY_HOPS = 1;
export const TRUST_PROXY_KEY = 'trust proxy' as const;

export const SESSION_TTL_SECONDS = DEFAULT_SESSION_TTL_SECONDS;

/**
 * ESTADOS DE MEDIDOR (Enum Mapping)
 */
export const METER_STATUSES = {
  BODEGA: {
    estadoId: 1,
    codigo: 'BODEGA',
    nombre: 'En Bodega',
    orden: 1,
  },
  INSTALADO: {
    estadoId: 2,
    codigo: 'INSTALADO',
    nombre: 'Instalado',
    orden: 2,
  },
  DANADO: {
    estadoId: 3,
    codigo: 'DANADO',
    nombre: 'Dañado',
    orden: 3,
  },
  PENDIENTE: {
    estadoId: 4,
    codigo: 'PENDIENTE',
    nombre: 'Pendiente',
    orden: 4,
  },
  BAJA: {
    estadoId: 5,
    codigo: 'BAJA',
    nombre: 'Dado de Baja',
    orden: 5,
  },
} as const;

export const METER_STATUS_LIST = Object.values(METER_STATUSES).sort(
  (a, b) => a.orden - b.orden,
);

/**
 * ESTADOS DE LOTE (Enum Mapping)
 */
export const BATCH_STATUSES = {
  BORRADOR: {
    estadoId: 1,
    codigo: 'BORRADOR',
    nombre: 'Borrador',
    orden: 1,
  },
  DEFINITIVO: {
    estadoId: 2,
    codigo: 'DEFINITIVO',
    nombre: 'Definitivo',
    orden: 2,
  },
  ENVIADO: {
    estadoId: 3,
    codigo: 'ENVIADO',
    nombre: 'Enviado',
    orden: 3,
  },
} as const;

export const BATCH_STATUS_LIST = Object.values(BATCH_STATUSES).sort(
  (a, b) => a.orden - b.orden,
);
