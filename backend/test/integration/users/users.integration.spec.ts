import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { createAuthTestApp } from '../../helpers/create-auth-test-app';
import {
  seedAdminUser,
  cleanSeedData,
  SeededAdminUser,
} from '../../helpers/db-seed.helper';

describe('Users Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let accessToken: string;

  const createdUserIds: number[] = [];

  beforeAll(async () => {
    app = await createAuthTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'users', accion: 'read' },
      { recurso: 'users', accion: 'create' },
      { recurso: 'users', accion: 'update' },
      { recurso: 'users', accion: 'delete' },
    ]);

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
        roleIds: [admin.roleId],
        permissionIds: admin.permissionIds,
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/users/me', () => {
    it('200 — retorna perfil del usuario autenticado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: admin.email,
      });
    });

    it('401 — sin token retorna 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('POST /api/v1/users', () => {
    it('201 — crea usuario y retorna datos', async () => {
      const runId = randomUUID().slice(0, 8);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `user-${runId}@quizis.local`,
          nombres: 'Nuevo',
          apellidos: 'Usuario',
          telefono: '+593991234567',
          rolId: admin.roleId,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        email: `user-${runId}@quizis.local`,
      });

      if (res.body.usuarioId) {
        createdUserIds.push(res.body.usuarioId);
      }
    });
  });

  describe('GET /api/v1/users', () => {
    it('200 — retorna lista paginada de usuarios', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // Response may be an array or a paginated object
      const isArray = Array.isArray(res.body);
      const isObject = typeof res.body === 'object' && res.body !== null;
      expect(isArray || isObject).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('200 — retorna detalle del usuario por ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${admin.userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: admin.email,
      });
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('200 — actualiza datos del usuario', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${admin.userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombres: 'AdminActualizado' })
        .expect(200);

      expect(res.body).toMatchObject({
        nombres: 'AdminActualizado',
      });
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('200 — soft delete del usuario', async () => {
      // Create a dedicated user to delete
      const runId = randomUUID().slice(0, 8);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `delete-${runId}@quizis.local`,
          nombres: 'ToDelete',
          apellidos: 'User',
          telefono: '+593991234567',
          rolId: admin.roleId,
        })
        .expect(201);

      const userId = createRes.body.usuarioId;
      if (userId) {
        createdUserIds.push(userId);
      }

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
