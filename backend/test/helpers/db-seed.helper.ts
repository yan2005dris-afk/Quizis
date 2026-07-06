import { PrismaService } from 'src/core/database/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const PASSWORD = 'Test@Integration1!';

export interface SeededAdminUser {
  userId: number;
  roleId: number;
  permissionIds: number[];
  email: string;
  password: string;
  runId: string;
}

export interface SeededBanco {
  bancoId: number;
}

export interface SeededSala {
  salaId: number;
  tokenCompartido: string;
  adminId: number;
  bancoId: number;
  estado: string;
}

export interface SeededParticipante {
  participanteId: number;
  salaId: number;
  nickname: string;
  rol: 'estudiante' | 'observador';
}

export interface SeedComodinesOpts {
  /** Defaults to all 4 comodines (IA, PUBLICO, 50_50, LLAMADA) */
  nombres?: ('IA' | 'PUBLICO' | '50_50' | 'LLAMADA')[];
}

export interface SeedPreguntaOpts {
  texto?: string;
}

export interface CleanSeedOptions {
  userIds?: number[];
  roleIds?: number[];
  bancoIds?: number[];
  salaIds?: number[];
  permissionIds?: number[];
  participanteIds?: number[];
}

/**
 * Crea un usuario administrador con los permisos indicados.
 * Sufijo UUID corto evita colisiones entre ejecuciones paralelas.
 */
export async function seedAdminUser(
  prisma: PrismaService,
  resources: Array<{ recurso: string; accion: string }>,
): Promise<SeededAdminUser> {
  const runId = randomUUID().slice(0, 8);
  const email = `admin-${runId}@quizis.local`;
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const role = await prisma.roles.create({
    data: { nombre: `__test_role_${runId}__` },
  });

  const permissionIds: number[] = [];

  for (const { recurso, accion } of resources) {
    const permiso = await prisma.permisos.create({
      data: {
        nombre: `${recurso}:${accion}:${runId}`,
        descripcion: `Test permission ${recurso}:${accion}`,
        recurso,
        accion,
      },
    });
    permissionIds.push(permiso.permisoId);

    await prisma.rolPermisos.create({
      data: {
        rolId: role.rolId,
        permisoId: permiso.permisoId,
      },
    });
  }

  const user = await prisma.usuarios.create({
    data: {
      email,
      clave: hashedPassword,
      nombres: 'Admin',
      apellidos: 'Test',
      rolId: role.rolId,
    },
  });

  return {
    userId: user.usuarioId,
    roleId: role.rolId,
    permissionIds,
    email,
    password: PASSWORD,
    runId,
  };
}

/**
 * Crea un banco de preguntas con N preguntas (cada una con 4 opciones, 1 correcta).
 * Por defecto crea 5 preguntas para satisfacer el límite mínimo al crear salas.
 */
export async function seedBanco(
  prisma: PrismaService,
  userId: number,
  name?: string,
  numPreguntas = 5,
): Promise<SeededBanco> {
  const runId = randomUUID().slice(0, 8);
  const nombre = name ?? `Banco Test ${runId}`;

  const banco = await prisma.bancoPreguntas.create({
    data: {
      nombre,
      descripcion: `Banco de prueba ${runId}`,
      admin: { connect: { usuarioId: userId } },
    },
  });

  for (let i = 0; i < numPreguntas; i++) {
    const pregunta = await prisma.preguntas.create({
      data: {
        bancoId: banco.bancoId,
        texto: `Pregunta ${i + 1} del banco ${runId}`,
        nivel: 1,
      },
    });

    for (let j = 0; j < 4; j++) {
      await prisma.opcionesPregunta.create({
        data: {
          preguntaId: pregunta.preguntaId,
          texto: `Opción ${j + 1}`,
          esCorrecta: j === 0, // primera opción es correcta
        },
      });
    }
  }

  return { bancoId: banco.bancoId };
}

/**
 * Crea una Sala en el estado indicado (default: 'BORRADOR') para el admin
 * indicado. Genera un `tokenCompartido` explícito (UUID) para que los tests
 * puedan referenciarlo determinísticamente.
 */
export async function seedSala(
  prisma: PrismaService,
  adminId: number,
  bancoId: number,
  opts: { estado?: string; nombre?: string } = {},
): Promise<SeededSala> {
  const tokenCompartido = randomUUID();
  const sala = await prisma.salas.create({
    data: {
      adminId,
      bancoId,
      nombre: opts.nombre ?? `Sala Test ${tokenCompartido.slice(0, 8)}`,
      tokenCompartido,
      estado: opts.estado ?? 'BORRADOR',
    },
  });
  return {
    salaId: sala.salaId,
    tokenCompartido: sala.tokenCompartido,
    adminId: sala.adminId,
    bancoId: sala.bancoId,
    estado: sala.estado,
  };
}

/**
 * Crea un participante (rol=estudiante|observador) en la sala indicada.
 * NO crea fila para el admin (admin nunca está en `participantes`).
 */
export async function seedParticipante(
  prisma: PrismaService,
  salaId: number,
  nickname: string,
  rol: 'estudiante' | 'observador',
  opts: { deletedAt?: Date } = {},
): Promise<SeededParticipante> {
  const p = await prisma.participantes.create({
    data: {
      salaId,
      nickname,
      rol,
      ...(opts.deletedAt ? { deletedAt: opts.deletedAt } : {}),
    },
  });
  return {
    participanteId: p.participanteId,
    salaId: p.salaId,
    nickname: p.nickname,
    rol: rol,
  };
}

/**
 * Crea filas en `SalaComodines` para que los endpoints /comodines/* no fallen
 * por FK faltante. Por defecto crea las 4 filas (todas `activo=true`).
 */
export async function seedComodinesForSala(
  prisma: PrismaService,
  salaId: number,
  opts: SeedComodinesOpts = {},
): Promise<void> {
  const nombres =
    opts.nombres ?? (['IA', 'PUBLICO', '50_50', 'LLAMADA'] as const);
  const catalog = await prisma.comodines.findMany({
    where: { nombre: { in: [...nombres] }, deletedAt: null },
    select: { comodinId: true },
  });
  for (const c of catalog) {
    await prisma.salaComodines.create({
      data: { salaId, comodinId: c.comodinId, activo: true },
    });
  }
}

/**
 * Helper opcional para tests que necesitan una pregunta + opciones
 * (votos, respuestas). Usa el banco ya creado por seedBanco.
 */
export async function seedPreguntaForSala(
  prisma: PrismaService,
  bancoId: number,
  options: SeedPreguntaOpts = {},
): Promise<{ preguntaId: number; opcionIds: number[] }> {
  const pregunta = await prisma.preguntas.create({
    data: {
      bancoId,
      texto: options.texto ?? `Pregunta Test ${randomUUID().slice(0, 8)}`,
      nivel: 1,
    },
  });
  const opcionIds: number[] = [];
  for (let j = 0; j < 4; j++) {
    const op = await prisma.opcionesPregunta.create({
      data: {
        preguntaId: pregunta.preguntaId,
        texto: `Opción ${j + 1}`,
        esCorrecta: j === 0,
      },
    });
    opcionIds.push(op.opcionId);
  }
  return { preguntaId: pregunta.preguntaId, opcionIds };
}

/**
 * Limpia exactamente los registros creados durante los tests.
 * Opera siempre por IDs — nunca por email/nombre.
 */
export async function cleanSeedData(
  prisma: PrismaService,
  opts: CleanSeedOptions,
): Promise<void> {
  const {
    userIds = [],
    roleIds = [],
    bancoIds = [],
    salaIds = [],
    permissionIds = [],
    participanteIds = [],
  } = opts;

  // Participantes por ID (antes que la limpieza por salaId para no perder refs)
  if (participanteIds.length > 0) {
    // Rondas reference participantes via participanteId — delete them
    // first to avoid FK violation. (Mirrors the order used in the
    // salaIds branch below.)
    await prisma.rondas.deleteMany({
      where: { participanteId: { in: participanteIds } },
    });
    await prisma.participantes.deleteMany({
      where: { participanteId: { in: participanteIds } },
    });
  }

  // Salas: dependencias antes del registro principal
  if (salaIds.length > 0) {
    await prisma.salaComodines.deleteMany({
      where: { salaId: { in: salaIds } },
    });
    // Delete rondas FIRST (they reference participantes + salas).
    // Then participantes (they reference salas). Then salas.
    await prisma.rondas.deleteMany({ where: { salaId: { in: salaIds } } });
    await prisma.participantes.deleteMany({
      where: { salaId: { in: salaIds } },
    });
    await prisma.salas.deleteMany({ where: { salaId: { in: salaIds } } });
  }

  // Bancos: preguntas -> opciones
  if (bancoIds.length > 0) {
    const preguntas = await prisma.preguntas.findMany({
      where: { bancoId: { in: bancoIds } },
      select: { preguntaId: true },
    });
    const preguntaIds = preguntas.map((p) => p.preguntaId);

    if (preguntaIds.length > 0) {
      await prisma.opcionesPregunta.deleteMany({
        where: { preguntaId: { in: preguntaIds } },
      });
      await prisma.preguntas.deleteMany({
        where: { preguntaId: { in: preguntaIds } },
      });
    }

    await prisma.bancoPreguntas.deleteMany({
      where: { bancoId: { in: bancoIds } },
    });
  }

  // Usuarios: sesiones primero
  if (userIds.length > 0) {
    await prisma.sesiones.deleteMany({ where: { usuarioId: { in: userIds } } });
    await prisma.usuarios.deleteMany({ where: { usuarioId: { in: userIds } } });
  }

  // Roles: relaciones primero
  if (roleIds.length > 0) {
    await prisma.rolPermisos.deleteMany({ where: { rolId: { in: roleIds } } });
    await prisma.roles.deleteMany({ where: { rolId: { in: roleIds } } });
  }

  // Permisos
  if (permissionIds.length > 0) {
    await prisma.permisos.deleteMany({
      where: { permisoId: { in: permissionIds } },
    });
  }
}
