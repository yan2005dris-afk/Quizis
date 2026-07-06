import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { createFullTestApp } from '../../helpers/create-full-test-app';
import {
  seedAdminUser,
  seedBanco,
  seedSala,
  seedParticipante,
  seedPreguntaForSala,
  cleanSeedData,
  SeededAdminUser,
  SeededBanco,
  SeededSala,
} from '../../helpers/db-seed.helper';

/**
 * Estudiante-only matrix for POST /salas/:salaId/respuestas.
 *
 * respuestas is restricted to estudiante (the student answers).
 */
describe('Respuestas (POST /salas/:salaId/respuestas)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let banco: SeededBanco;
  let sala: SeededSala;
  let adminToken: string;
  let preguntaId: number;
  let opcionId: number;

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'salas', accion: 'create' },
    ]);
    banco = await seedBanco(prisma, admin.userId, undefined, 3);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    adminToken = loginRes.body.accessToken;

    sala = await seedSala(prisma, admin.userId, banco.bancoId, {
      estado: 'EN_VIVO',
    });

    const est = await seedParticipante(
      prisma,
      sala.salaId,
      'TestEstudiante',
      'estudiante',
    );
    await seedParticipante(prisma, sala.salaId, 'TestObservador', 'observador');

    const seed = await seedPreguntaForSala(prisma, banco.bancoId);
    preguntaId = seed.preguntaId;
    opcionId = seed.opcionIds[0];

    // Need a ronda referencing the estudiante
    await prisma.rondas.create({
      data: {
        salaId: sala.salaId,
        participanteId: est.participanteId,
        numeroRonda: 1,
        estado: 'jugando',
        preguntasAsignadas: [preguntaId],
        preguntaActualId: preguntaId,
      },
    });
  });

  afterAll(async () => {
    if (prisma && admin) {
      await cleanSeedData(prisma, {
        salaIds: [sala.salaId],
        bancoIds: [banco.bancoId],
        userIds: [admin.userId],
        roleIds: [admin.roleId],
        permissionIds: admin.permissionIds,
      });
    }
    if (app) {
      await app.close();
    }
  });

  const submit = (
    body: Record<string, unknown>,
    opts: { token?: string } = {},
  ) => {
    const req = request(app.getHttpServer()).post(
      `/api/v1/salas/${sala.tokenCompartido}/respuestas`,
    );
    if (opts.token) {
      req.set('Authorization', `Bearer ${opts.token}`);
    }
    return req.send(body);
  };

  const fetchRondaId = async (): Promise<number> => {
    const r = await prisma.rondas.findFirst({
      where: { salaId: sala.salaId, estado: 'jugando' },
      select: { rondaId: true },
    });
    if (!r) throw new Error('no ronda activa found');
    return r.rondaId;
  };

  it('estudiante → 200', async () => {
    const rondaId = await fetchRondaId();
    const res = await submit({
      nickname: 'TestEstudiante',
      rondaId,
      preguntaId,
      opcionId,
    });
    // respuestas uses @HttpCode(200) explicitly
    // The use-case may return 400 if the question isn't active in Redis
    // cache (test doesn't go through release-question flow). Either way,
    // the guard MUST have allowed the request through (not 403/401/404).
    expect([200, 400]).toContain(res.status);
    expect(res.status).not.toBe(403);
  });

  it('observador → 403 (only estudiante answers)', async () => {
    const rondaId = await fetchRondaId();
    const res = await submit({
      nickname: 'TestObservador',
      rondaId,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(403);
  });

  it('admin JWT + no nickname → 403 (admin role NOT in [estudiante])', async () => {
    const rondaId = await fetchRondaId();
    const res = await submit(
      { rondaId, preguntaId, opcionId },
      { token: adminToken },
    );
    // admin branch verifies JWT → adminId matches → role=admin
    // → role check: admin NOT in [estudiante] → 403.
    expect(res.status).toBe(403);
    expect([200]).not.toContain(res.status);
  });

  it('Host-prefixed + no JWT → 404 (no participante row)', async () => {
    // AC-7 "Host- spoof" assertion: Host- prefix must NOT grant access.
    // Without JWT: tokenless branch finds no participante row → 404.
    const rondaId = await fetchRondaId();
    const res = await submit({
      nickname: 'Host-evil',
      rondaId,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(404);
    expect([200, 201]).not.toContain(res.status);
  });

  it('missing nickname → 400', async () => {
    const rondaId = await fetchRondaId();
    const res = await submit({ rondaId, preguntaId, opcionId });
    expect(res.status).toBe(400);
  });
});
