import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { createFullTestApp } from '../../helpers/create-full-test-app';
import {
  seedAdminUser,
  seedBanco,
  seedSala,
  seedParticipante,
  cleanSeedData,
  SeededAdminUser,
  SeededBanco,
  SeededSala,
} from '../../helpers/db-seed.helper';
import { ParticipantRoleGuard } from 'src/juego/shared/auth/participant-role.guard';

/**
 * Heart spec for ParticipantRoleGuard.
 *
 * Exercises the 3 resolution layers against POST /salas/:salaId/mensajes
 * (the broadest role matrix: admin | estudiante | observador).
 *
 * AC-2 verification matrix:
 *   Layer 1 (ADMIN BRANCH):
 *     ✓ admin JWT + own sala → role=admin (201)
 *     ✗ admin JWT + different sala → fall through to Layer 2 → 400 (no nickname)
 *     ✗ malformed token → fall through to Layer 2 (no 401)
 *     ✗ expired token → fall through to Layer 2 (no 401)
 *   Layer 2 (TOKENLESS BRANCH):
 *     ✓ participante estudiante → 201
 *     ✓ participante observador → 201
 *     ✗ missing nickname → 400
 *     ✗ unknown nickname → 404
 *     ✗ unknown tokenCompartido → 404
 *     ✗ soft-deleted participante → 404
 *   Layer 3 (ROLE CHECK):
 *     ✗ Host-anything + no JWT → 404 (no row) — strict spoof assertion is in comodines-rest
 *     ✗ role not in @ParticipantRoles → 403
 *     ✗ missing @ParticipantRoles decorator → 403 deny-by-default
 *     ✓ attaches request.participante on success
 */
describe('ParticipantRoleGuard (POST /salas/:salaId/mensajes)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let banco: SeededBanco;
  let sala: SeededSala;
  let adminToken: string;

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'salas', accion: 'create' },
      { recurso: 'salas', accion: 'read' },
      { recurso: 'salas', accion: 'update' },
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

    // Two active participantes for tokenless branch coverage
    await seedParticipante(prisma, sala.salaId, 'TestEstudiante', 'estudiante');
    await seedParticipante(prisma, sala.salaId, 'TestObservador', 'observador');
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

  const send = (overrides: {
    token?: string;
    salaId?: string;
    body?: Record<string, unknown>;
  }) => {
    const req = request(app.getHttpServer()).post(
      `/api/v1/salas/${overrides.salaId ?? sala.tokenCompartido}/mensajes`,
    );
    if (overrides.token) {
      req.set('Authorization', `Bearer ${overrides.token}`);
    }
    return req.send(
      overrides.body ?? {
        nickname: 'TestEstudiante',
        texto: 'hola',
        tipo: 'mensaje',
      },
    );
  };

  // ─── Layer 1: admin branch ─────────────────────────────────────
  describe('Layer 1 — admin branch (JWT)', () => {
    it('admin JWT for own sala → role=admin (201)', async () => {
      const res = await send({
        token: adminToken,
        body: { texto: 'admin message', tipo: 'mensaje' },
      });
      // Note: mensajes controller doesn't require nickname in body for admin
      // path; guard accepts admin via JWT, body validation runs separately.
      expect(res.status).toBe(201);
    });

    it('admin JWT for different sala → fall through → 400 (no nickname)', async () => {
      // Create a sala NOT owned by this admin
      const otherAdmin = await seedAdminUser(prisma, [
        { recurso: 'salas', accion: 'create' },
      ]);
      const otherBanco = await seedBanco(
        prisma,
        otherAdmin.userId,
        undefined,
        1,
      );
      const otherSala = await seedSala(
        prisma,
        otherAdmin.userId,
        otherBanco.bancoId,
      );

      try {
        const res = await send({
          token: adminToken,
          salaId: otherSala.tokenCompartido,
          body: { texto: 'intruder', tipo: 'mensaje' },
        });
        // Guard falls through (adminId mismatch), then tokenless branch
        // throws 400 because body has no nickname.
        expect(res.status).toBe(400);
      } finally {
        await cleanSeedData(prisma, {
          salaIds: [otherSala.salaId],
          bancoIds: [otherBanco.bancoId],
          userIds: [otherAdmin.userId],
          roleIds: [otherAdmin.roleId],
          permissionIds: otherAdmin.permissionIds,
        });
      }
    });

    it('malformed token → fall through → 400 (no nickname) — NEVER 401', async () => {
      // No body.nickname → guard's tokenless branch throws 400.
      const res = await send({
        token: 'not-a-real-jwt',
        body: { texto: 'no nick', tipo: 'mensaje' },
      });
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(401);
    });

    it('expired/invalid signature → fall through → 400 — NEVER 401', async () => {
      const res = await send({
        token: 'eyJhbGciOiJIUzI1NiJ9.invalid.signature',
        body: { texto: 'no nick', tipo: 'mensaje' },
      });
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(401);
    });
  });

  // ─── Layer 2: tokenless branch ─────────────────────────────────
  describe('Layer 2 — tokenless branch', () => {
    it('estudiante nickname → 201', async () => {
      const res = await send({
        body: { nickname: 'TestEstudiante', texto: 'hi', tipo: 'mensaje' },
      });
      expect(res.status).toBe(201);
    });

    it('observador nickname → 201', async () => {
      const res = await send({
        body: { nickname: 'TestObservador', texto: 'hi', tipo: 'mensaje' },
      });
      expect(res.status).toBe(201);
    });

    it('missing nickname → 400', async () => {
      const res = await send({ body: { texto: 'no nick', tipo: 'mensaje' } });
      expect(res.status).toBe(400);
    });

    it('unknown nickname → 404', async () => {
      const res = await send({
        body: { nickname: 'GhostUser', texto: 'hi', tipo: 'mensaje' },
      });
      expect(res.status).toBe(404);
    });

    it('unknown tokenCompartido → 404', async () => {
      const res = await send({
        salaId: '00000000-0000-0000-0000-000000000000',
        body: { nickname: 'TestEstudiante', texto: 'hi', tipo: 'mensaje' },
      });
      expect(res.status).toBe(404);
    });

    it('soft-deleted participante → 404', async () => {
      const deleted = await seedParticipante(
        prisma,
        sala.salaId,
        'TestSoftDeleted',
        'estudiante',
        { deletedAt: new Date() },
      );
      try {
        const res = await send({
          body: { nickname: 'TestSoftDeleted', texto: 'hi', tipo: 'mensaje' },
        });
        expect(res.status).toBe(404);
      } finally {
        await prisma.participantes.deleteMany({
          where: { participanteId: deleted.participanteId },
        });
      }
    });
  });

  // ─── Layer 3: role check ───────────────────────────────────────
  describe('Layer 3 — role check', () => {
    it('Host-anything + no JWT → 404 (no participante row matches)', async () => {
      // AC-8's strict assertion is in comodines-rest.spec.ts; this case
      // documents the same matrix via mensajes (which is open to all 3 roles).
      // The spoof doesn't escalate because admin role is in the allowed matrix
      // AND no participante row exists for the Host- prefix → 404.
      const res = await send({
        body: { nickname: 'Host-evil', texto: 'spoof', tipo: 'mensaje' },
      });
      expect(res.status).toBe(404);
    });
  });
});

/**
 * Layer 3: deny-by-default control.
 *
 * The guard fails CLOSED when `@ParticipantRoles(...)` is missing — a defense-
 * in-depth rule that prevents accidental "open to everyone" endpoints if a
 * future contributor forgets the decorator. This is documented in the spec
 * docstring but previously had no dedicated assertion; this unit-style block
 * pins the behavior.
 */
describe('ParticipantRoleGuard — deny-by-default (Layer 3 control)', () => {
  let guardModule: TestingModule;
  let guard: ParticipantRoleGuard;

  // Mocks: simulate a request that successfully resolves a participante so
  // execution reaches the role-check stage. Then Reflector returns
  // `undefined` for `@ParticipantRoles` → guard must throw 403.
  const fakeReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(undefined),
  };
  const fakePrisma = {
    salas: {
      findUnique: jest.fn().mockResolvedValue({ salaId: 1 }),
    },
    participantes: {
      findFirst: jest.fn().mockResolvedValue({
        participanteId: 99,
        rol: 'estudiante',
      }),
    },
  };
  const fakeJwt = { verifyAsync: jest.fn() };
  const fakeConfig = { getOrThrow: jest.fn().mockReturnValue('secret') };

  beforeAll(async () => {
    guardModule = await Test.createTestingModule({
      providers: [
        ParticipantRoleGuard,
        { provide: Reflector, useValue: fakeReflector },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: JwtService, useValue: fakeJwt },
        { provide: ConfigService, useValue: fakeConfig },
      ],
    }).compile();

    guard = guardModule.get(ParticipantRoleGuard);
  });

  afterAll(async () => {
    if (guardModule) await guardModule.close();
  });

  it('handler sin @ParticipantRoles → 403 deny-by-default', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          params: { salaId: 'token-x' },
          body: { nickname: 'TestUser' },
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as Parameters<typeof guard.canActivate>[0];

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
