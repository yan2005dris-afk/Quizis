import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { createFullTestApp } from '../../helpers/create-full-test-app';
import {
  seedAdminUser,
  cleanSeedData,
  SeededAdminUser,
} from '../../helpers/db-seed.helper';

describe('Bancos Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let accessToken: string;

  const createdBancoIds: number[] = [];

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'bancos', accion: 'read' },
      { recurso: 'bancos', accion: 'create' },
      { recurso: 'bancos', accion: 'update' },
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
        bancoIds: createdBancoIds,
        userIds: [admin.userId],
        roleIds: [admin.roleId],
        permissionIds: admin.permissionIds,
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/bancos', () => {
    it('201 — crea banco y retorna bancoId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bancos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Banco Integration Test' })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.objectContaining({ bancoId: expect.any(Number) }),
      });

      createdBancoIds.push(res.body.data.bancoId);
    });

    it('400 — falta nombre retorna error de validación', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bancos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ descripcion: 'Sin nombre' })
        .expect(400);
    });
  });

  describe('GET /api/v1/bancos', () => {
    it('200 — retorna array con el banco creado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bancos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });

      const bancoIds = (res.body.data as any[]).map((b: any) => b.bancoId);
      expect(bancoIds).toEqual(expect.arrayContaining(createdBancoIds));
    });

    it('401 — sin token retorna 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bancos')
        .expect(401);
    });
  });

  describe('GET /api/v1/bancos/:id', () => {
    it('200 — retorna banco con preguntas', async () => {
      const bancoId = createdBancoIds[0];

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bancos/${bancoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.objectContaining({ bancoId }),
      });
    });

    it('404 — banco inexistente retorna not found', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bancos/999999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/bancos/:id/preguntas', () => {
    it('201 — agrega preguntas y retorna totalCreadas', async () => {
      const bancoId = createdBancoIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/bancos/${bancoId}/preguntas`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([
          {
            texto: 'Pregunta de prueba 1',
            opciones: [
              { texto: 'Opción A', esCorrecta: true },
              { texto: 'Opción B' },
              { texto: 'Opción C' },
              { texto: 'Opción D' },
            ],
          },
          {
            texto: 'Pregunta de prueba 2',
            opciones: [
              { texto: 'Opción A' },
              { texto: 'Opción B', esCorrecta: true },
              { texto: 'Opción C' },
              { texto: 'Opción D' },
            ],
          },
        ])
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.objectContaining({ totalCreadas: 2, bancoId }),
      });
    });
  });

  describe('PATCH /api/v1/bancos/:id', () => {
    it('200 — actualiza nombre del banco', async () => {
      const bancoId = createdBancoIds[0];

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bancos/${bancoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Banco Actualizado Test' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.objectContaining({ nombre: 'Banco Actualizado Test' }),
      });
    });
  });
});
