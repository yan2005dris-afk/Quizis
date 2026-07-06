import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { GameEvents } from 'src/core/common/events/game-events.types';
import { createFullTestApp } from '../../helpers/create-full-test-app';
import {
  seedAdminUser,
  seedBanco,
  seedSala,
  seedParticipante,
  seedComodinesForSala,
  cleanSeedData,
  SeededAdminUser,
  SeededBanco,
  SeededSala,
  SeededParticipante,
} from '../../helpers/db-seed.helper';

/**
 * Three endpoints × estudiante-only matrix.
 *
 * **CONTAINS THE HOST- SPOOF REGRESSION TEST** (AC-8):
 * Before this change, a nickname starting with `Host-` returned
 * `{ participanteId: -1, rol: 'admin' }` from the inline `resolveParticipante`
 * helper in comodines-rest.controller.ts. Since the controller did NOT check
 * the rol, any Host-prefixed nickname could trigger admin-level comodin
 * mutations (block comodines, activate llamada, send hint) — a credential-
 * escalation spoof.
 *
 * After this change: Host-anything has no participante row match → tokenless
 * branch → 404. Admin JWT for own sala → admin role NOT in [estudiante] → 403.
 *
 * The CRITICAL assertion is: NO 2xx is returned for the Host- spoof.
 */
describe('Comodines REST (POST /salas/:salaId/comodines/...)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let admin: SeededAdminUser;
  let banco: SeededBanco;
  let sala: SeededSala;
  let estudiante: SeededParticipante;
  let adminToken: string;

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);
    eventEmitter = app.get(EventEmitter2);

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

estudiante = await seedParticipante(
          prisma,
          sala.salaId,
          'TestEstudiante',
          'estudiante',
        );
        await seedParticipante(prisma, sala.salaId, 'TestObservador', 'observador');

    await seedComodinesForSala(prisma, sala.salaId);
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

  // ─── POST /salas/:salaId/comodines/:tipo/bloquear ─────────────
  describe('POST /:tipo/bloquear', () => {
    const bloquear = (
      tipo: string,
      body: Record<string, unknown>,
      opts: { token?: string } = {},
    ) => {
      const req = request(app.getHttpServer()).post(
        `/api/v1/salas/${sala.tokenCompartido}/comodines/${tipo}/bloquear`,
      );
      if (opts.token) {
        req.set('Authorization', `Bearer ${opts.token}`);
      }
      return req.send(body);
    };

    it('estudiante → 201', async () => {
      const res = await bloquear('PUBLICO', { nickname: 'TestEstudiante' });
      expect(res.status).toBe(201);
    });

    it('observador → 403', async () => {
      const res = await bloquear('PUBLICO', { nickname: 'TestObservador' });
      expect(res.status).toBe(403);
    });

    it('admin JWT for own sala → 403 (admin NOT in [estudiante])', async () => {
      const res = await bloquear('PUBLICO', {}, { token: adminToken });
      expect(res.status).toBe(403);
    });

    it('HOST- SPOOF REGRESSION: Host-prefixed nickname + NO valid JWT → ≥ 400 (not 200/201)', async () => {
      // The fix: Host-anything must NEVER reach a 2xx response on comodines.
      // Tokenless branch: participante.findFirst with nickname='Host-evil' → null → 404.
      const res = await bloquear('PUBLICO', { nickname: 'Host-evil' });
      expect([200, 201]).not.toContain(res.status);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('HOST- SPOOF with bogus Bearer header → ≥ 400', async () => {
      // Bearer present but not a real JWT → admin branch verifyAsync fails →
      // falls through to tokenless → 404.
      const res = await bloquear(
        'PUBLICO',
        { nickname: 'Host-evil' },
        { token: 'not-a-real-jwt' },
      );
      expect([200, 201]).not.toContain(res.status);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

it('missing nickname → 400', async () => {
      const res = await bloquear('PUBLICO', {});
      expect(res.status).toBe(400);
    });

    it('estudiante bloquear → comodin_bloqueado WS event userId = participanteId (no sentinel 0)', async () => {
      // Regression: pre-fix, the controller forwarded `userId: 0` to
      // BlockComodinUseCase → broadcast `comodin_bloqueado { userId: 0 }`
      // to every WS client. The use-case must receive the real
      // participanteId so audit logs identify the actor.
      let captured: { userId?: number } | undefined;
      const handler = (payload: { userId?: number }) => {
    captured = payload;
      };
      eventEmitter.on(GameEvents.COMODINES.BLOQUEADO, handler);
      try {
    const res = await bloquear('50_50', { nickname: 'TestEstudiante' });
    expect(res.status).toBe(201);
    expect(captured).toBeDefined();
    expect(captured!.userId).toBe(estudiante.participanteId);
    expect(captured!.userId).not.toBe(0);
      } finally {
    eventEmitter.off(GameEvents.COMODINES.BLOQUEADO, handler);
      }
    });
  });

  // ─── POST /salas/:salaId/comodines/llamada/activar ────────────
  describe('POST /llamada/activar', () => {
    const activar = (
      body: Record<string, unknown>,
      opts: { token?: string } = {},
    ) => {
      const req = request(app.getHttpServer()).post(
        `/api/v1/salas/${sala.tokenCompartido}/comodines/llamada/activar`,
      );
      if (opts.token) {
        req.set('Authorization', `Bearer ${opts.token}`);
      }
      return req.send(body);
    };

    it('estudiante → 201', async () => {
      const res = await activar({ nickname: 'TestEstudiante' });
      expect(res.status).toBe(201);
    });

    it('observador → 403', async () => {
      const res = await activar({ nickname: 'TestObservador' });
      expect(res.status).toBe(403);
    });

    it('admin JWT for own sala → 403', async () => {
      const res = await activar({}, { token: adminToken });
      expect(res.status).toBe(403);
    });

    it('HOST- SPOOF REGRESSION: Host-prefixed + no JWT → ≥ 400', async () => {
      const res = await activar({ nickname: 'Host-evil' });
      expect([200, 201]).not.toContain(res.status);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('missing nickname → 400', async () => {
      const res = await activar({});
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /salas/:salaId/comodines/llamada/pista ──────────────
  describe('POST /llamada/pista', () => {
    const pista = (
      body: Record<string, unknown>,
      opts: { token?: string } = {},
    ) => {
      const req = request(app.getHttpServer()).post(
        `/api/v1/salas/${sala.tokenCompartido}/comodines/llamada/pista`,
      );
      if (opts.token) {
        req.set('Authorization', `Bearer ${opts.token}`);
      }
      return req.send(body);
    };

    it('estudiante → 201', async () => {
      const res = await pista({
        nickname: 'TestEstudiante',
        preguntaId: 1,
        pista: 'hint text',
      });
      expect(res.status).toBe(201);
    });

    it('observador → 403', async () => {
      const res = await pista({
        nickname: 'TestObservador',
        preguntaId: 1,
        pista: 'hint text',
      });
      expect(res.status).toBe(403);
    });

    it('admin JWT for own sala → 403', async () => {
      const res = await pista(
        { preguntaId: 1, pista: 'x' },
        { token: adminToken },
      );
      expect(res.status).toBe(403);
    });

    it('HOST- SPOOF REGRESSION: Host-prefixed + no JWT → ≥ 400', async () => {
      const res = await pista({
        nickname: 'Host-evil',
        preguntaId: 1,
        pista: 'spoof',
      });
      expect([200, 201]).not.toContain(res.status);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('missing nickname → 400', async () => {
      const res = await pista({ preguntaId: 1, pista: 'x' });
      expect(res.status).toBe(400);
    });
  });
});
