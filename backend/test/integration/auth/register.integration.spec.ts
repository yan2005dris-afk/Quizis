import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { createAuthTestApp } from '../../helpers/create-auth-test-app';
import {
  seedAdminUser,
  cleanSeedData,
  SeededAdminUser,
} from '../../helpers/db-seed.helper';

describe('Auth Register Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let accessToken: string;
  let defaultUserRoleId: number | null = null;

  // Track users created during tests for cleanup
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    app = await createAuthTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'users', accion: 'create' },
    ]);

    // Ensure a default 'user' role exists (required by create-user use case)
    const existingDefaultRole = await prisma.roles.findFirst({
      where: { nombre: 'user', deletedAt: null },
    });
    if (!existingDefaultRole) {
      const created = await prisma.roles.create({ data: { nombre: 'user' } });
      defaultUserRoleId = created.rolId;
    }

    // Login to get access token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma && admin) {
      await cleanSeedData(prisma, {
        userIds: [admin.userId, ...createdUserIds],
        roleIds: defaultUserRoleId
          ? [admin.roleId, defaultUserRoleId]
          : [admin.roleId],
        permissionIds: admin.permissionIds,
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('201 — datos válidos crean usuario y retornan userId + email', async () => {
      const runId = randomUUID().slice(0, 8);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `new-${runId}@quizis.local`,
          nombres: 'Nuevo',
          apellidos: 'Usuario',
          telefono: '+593991234567',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        usuarioId: expect.any(Number),
        message: expect.any(String),
      });

      // Track for cleanup
      if (res.body.usuarioId) {
        createdUserIds.push(res.body.usuarioId);
      }
    });

    it('400 — falta email retorna error de validación', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombres: 'Sin',
          apellidos: 'Email',
          telefono: '+593991234567',
        })
        .expect(400);
    });

    it('401 — sin token retorna 401', async () => {
      const runId = randomUUID().slice(0, 8);
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `noauth-${runId}@quizis.local`,
          nombres: 'Sin',
          apellidos: 'Auth',
          telefono: '+593991234567',
        })
        .expect(401);
    });

    it('403 — token sin permiso users:create retorna 403', async () => {
      // Create a user with NO permissions
      const noPermAdmin = await seedAdminUser(prisma, []);
      const noPermLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: noPermAdmin.email, password: noPermAdmin.password })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${noPermLoginRes.body.accessToken}`)
        .send({
          email: `forbidden-${randomUUID().slice(0, 8)}@quizis.local`,
          nombres: 'Forbidden',
          apellidos: 'User',
          telefono: '+593991234567',
        })
        .expect(403);

      // Cleanup no-perm user
      await cleanSeedData(prisma, {
        userIds: [noPermAdmin.userId],
        roleIds: [noPermAdmin.roleId],
        permissionIds: noPermAdmin.permissionIds,
      });
    });

    it('409 — email duplicado retorna conflicto', async () => {
      const runId = randomUUID().slice(0, 8);
      const email = `dup-${runId}@quizis.local`;

      // First registration
      const firstRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email,
          nombres: 'Dup',
          apellidos: 'User',
          telefono: '+593991234567',
        })
        .expect(201);

      if (firstRes.body.usuarioId) {
        createdUserIds.push(firstRes.body.usuarioId);
      }

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email,
          nombres: 'Dup',
          apellidos: 'User',
          telefono: '+593991234567',
        })
        .expect(409);
    });
  });
});
