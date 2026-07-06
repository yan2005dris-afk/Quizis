import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { ChatCacheService } from 'src/juego/chat/infrastructure/cache/chat-cache.service';
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

/**
 * Full role matrix for POST /salas/:salaId/mensajes.
 *
 * mensajes is open to admin | estudiante | observador (per role matrix).
 */
describe('Mensajes (POST /salas/:salaId/mensajes)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let chatCache: ChatCacheService;
  let admin: SeededAdminUser;
  let banco: SeededBanco;
  let sala: SeededSala;
  let adminToken: string;

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);
    chatCache = app.get(ChatCacheService);

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

  const send = (
    body: Record<string, unknown>,
    opts: { token?: string; salaId?: string } = {},
  ) => {
    const req = request(app.getHttpServer()).post(
      `/api/v1/salas/${opts.salaId ?? sala.tokenCompartido}/mensajes`,
    );
    if (opts.token) {
      req.set('Authorization', `Bearer ${opts.token}`);
    }
    return req.send(body);
  };

  it('admin (own sala, via JWT) → 201', async () => {
    const res = await send(
      { texto: 'admin hi', tipo: 'mensaje' },
      { token: adminToken },
    );
    expect(res.status).toBe(201);
  });

  it('estudiante → 201', async () => {
    const res = await send({
      nickname: 'TestEstudiante',
      texto: 'estudiante hi',
      tipo: 'mensaje',
    });
    expect(res.status).toBe(201);
  });

  it('observador → 201', async () => {
    const res = await send({
      nickname: 'TestObservador',
      texto: 'observador hi',
      tipo: 'mensaje',
    });
    expect(res.status).toBe(201);
  });

  it('missing nickname → 400', async () => {
    const res = await send({ texto: 'no nick', tipo: 'mensaje' });
    expect(res.status).toBe(400);
  });

  it('unknown nickname → 404', async () => {
    const res = await send({
      nickname: 'NobodyHere',
      texto: 'hi',
      tipo: 'mensaje',
    });
    expect(res.status).toBe(404);
  });

  it('spoof: Host-prefixed + no JWT → 404 (no participante row)', async () => {
    const res = await send({
      nickname: 'Host-evil',
      texto: 'spoof',
      tipo: 'mensaje',
    });
    expect(res.status).toBe(404);
  });

  it('sala not found → 404', async () => {
    const res = await send(
      {
        nickname: 'TestEstudiante',
        texto: 'hi',
        tipo: 'mensaje',
      },
      { salaId: '00000000-0000-0000-0000-000000000000' },
    );
    expect(res.status).toBe(404);
  });

  it('admin (own sala, via JWT, sin nickname en body) → 201 y mensaje persistido con usuario no vacío', async () => {
    // Regression: pre-fix el admin path enviaba nickname='' a ChatService,
    // dejando el campo `usuario` del mensaje persistido vacío — un hueco de
    // auditoría. El fix: el controller deriva `Admin #<userId>` cuando el
    // guard resolvió role='admin' y no hay nickname en el body.
    const texto = `admin-audit-${Date.now()}`;
    const res = await send({ texto, tipo: 'mensaje' }, { token: adminToken });
    expect(res.status).toBe(201);

    const messages = await chatCache.getMessages(sala.tokenCompartido);
    const persisted = messages.find((m) => m.texto === texto);
    expect(persisted).toBeDefined();
    expect(persisted!.usuario).toBeTruthy();
    expect(persisted!.usuario.length).toBeGreaterThan(0);
  });
});
