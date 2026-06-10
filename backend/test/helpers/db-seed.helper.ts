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

export interface CleanSeedOptions {
  userIds?: number[];
  roleIds?: number[];
  bancoIds?: number[];
  salaIds?: number[];
  permissionIds?: number[];
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
  } = opts;

  // Salas: dependencias antes del registro principal
  if (salaIds.length > 0) {
    await prisma.salaComodines.deleteMany({
      where: { salaId: { in: salaIds } },
    });
    await prisma.participantes.deleteMany({
      where: { salaId: { in: salaIds } },
    });
    await prisma.rondas.deleteMany({ where: { salaId: { in: salaIds } } });
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
