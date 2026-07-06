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
 * Observador-only matrix for POST /salas/:salaId/votos.
 *
 * votos is restricted to observador (audience vote). estudiante is forbidden
 * (they play, they don't vote).
 */
describe('Votos REST (POST /salas/:salaId/votos)', () => {
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

    await seedParticipante(prisma, sala.salaId, 'TestEstudiante', 'estudiante');
    const obs = await seedParticipante(
      prisma,
      sala.salaId,
      'TestObservador',
      'observador',
    );

    const seed = await seedPreguntaForSala(prisma, banco.bancoId);
    preguntaId = seed.preguntaId;
    opcionId = seed.opcionIds[0];

    // Need a ronda to satisfy downstream use-case validations
    await prisma.rondas.create({
      data: {
        salaId: sala.salaId,
        participanteId: obs.participanteId,
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

  const vote = (
    body: Record<string, unknown>,
    opts: { token?: string; rondaId?: number } = {},
  ) => {
    const req = request(app.getHttpServer()).post(
      `/api/v1/salas/${sala.tokenCompartido}/votos`,
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

  it('observador → 201', async () => {
    const rondaId = await fetchRondaId();
    const res = await vote({
      nickname: 'TestObservador',
      rondaId,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(201);
  });

  it('estudiante → 403 (defense in depth — estudiante can answer, not vote)', async () => {
    const rondaId = await fetchRondaId();
    const res = await vote({
      nickname: 'TestEstudiante',
      rondaId,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(403);
  });

  it('admin JWT for own sala → 403 (admin denied by rol matrix [observador]), NOT 200', async () => {
    const rondaId = await fetchRondaId();
    const res = await vote(
      {
        rondaId,
        preguntaId,
        opcionId,
      },
      { token: adminToken },
    );
    // admin branch verifies JWT → looks up sala → adminId matches → role=admin
    // → role check: admin not in [observador] → 403.
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(200);
  });

  it('Host-prefixed + no JWT → 404 (no participante row matches Host-)', async () => {
    // Host-evil has no participante row → tokenless branch finds none → 404.
    // AC-6's "Host- spoof" assertion is: Host- prefix must NOT grant access.
    // Both 404 (no row) and 403 (role mismatch) achieve denial — 404 here is
    // the stricter signal (no such participant).
    const res = await vote({
      nickname: 'Host-evil',
      rondaId: 1,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(404);
    expect([200, 201]).not.toContain(res.status);
  });

  it('missing nickname → 400', async () => {
    const rondaId = await fetchRondaId();
    const res = await vote({
      rondaId,
      preguntaId,
      opcionId,
    });
    expect(res.status).toBe(400);
  });
});
