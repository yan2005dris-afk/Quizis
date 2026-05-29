import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { createFullTestApp } from '../../helpers/create-full-test-app';
import {
  seedAdminUser,
  seedBanco,
  cleanSeedData,
  SeededAdminUser,
  SeededBanco,
} from '../../helpers/db-seed.helper';

describe('Salas Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: SeededAdminUser;
  let banco: SeededBanco;
  let accessToken: string;

  const createdSalaIds: number[] = [];

  beforeAll(async () => {
    app = await createFullTestApp();
    prisma = app.get(PrismaService);

    admin = await seedAdminUser(prisma, [
      { recurso: 'salas', accion: 'create' },
      { recurso: 'salas', accion: 'read' },
      { recurso: 'salas', accion: 'update' },
    ]);

    // Seed a banco with enough questions for sala creation (limit=1)
    banco = await seedBanco(prisma, admin.userId, undefined, 5);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma && admin) {
      await cleanSeedData(prisma, {
        salaIds: createdSalaIds,
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

  describe('POST /api/v1/salas', () => {
    it('201 — crea sala con bancoId + nombre, retorna salaId e invitacionToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/salas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bancoId: banco.bancoId,
          nombre: 'Sala Integration Test',
          limitePreguntas: 1,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        salaId: expect.any(Number),
        tokenInvitacion: expect.any(String),
      });

      createdSalaIds.push(res.body.salaId);
    });

    it('400 — falta bancoId retorna error de validación', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/salas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Sin Banco' })
        .expect(400);
    });
  });

  describe('GET /api/v1/salas', () => {
    it('200 — retorna array con la sala creada', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/salas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const salaIds = (res.body as any[]).map((s: any) => s.salaId);
      expect(salaIds).toEqual(expect.arrayContaining(createdSalaIds));
    });

    it('401 — sin token retorna 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/salas').expect(401);
    });
  });

  describe('GET /api/v1/salas/join/:token', () => {
    it('200 — token de invitación válido retorna info de la sala', async () => {
      // Get the invitation token from the first created sala
      const salaId = createdSalaIds[0];

      const linkRes = await request(app.getHttpServer())
        .get(`/api/v1/salas/${salaId}/link-invitacion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const token = linkRes.body.tokenInvitacion;
      expect(token).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/salas/join/${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        salaId: expect.any(Number),
        nombre: expect.any(String),
      });
    });
  });

  describe('POST /api/v1/salas/join', () => {
    it('201 — unirse con token + nickname retorna participanteToken', async () => {
      const salaId = createdSalaIds[0];

      const linkRes = await request(app.getHttpServer())
        .get(`/api/v1/salas/${salaId}/link-invitacion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const token = linkRes.body.tokenInvitacion;

      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/join')
        .send({ token, nickname: 'TestPlayer' })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        sessionToken: expect.any(String),
      });
    });
  });

  describe('GET /api/v1/salas/:id', () => {
    it('200 — retorna detalle de la sala', async () => {
      const salaId = createdSalaIds[0];

      const res = await request(app.getHttpServer())
        .get(`/api/v1/salas/${salaId}`)
        .expect(200);

      expect(res.body).toMatchObject({
        salaId: expect.any(Number),
      });
    });
  });

  describe('PATCH /api/v1/salas/:id/configuracion', () => {
    it('200 — actualiza nombre de la sala', async () => {
      const salaId = createdSalaIds[0];

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/salas/${salaId}/configuracion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Sala Actualizada Test' })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /api/v1/salas/:id/estado', () => {
    it('200 — actualiza estado de la sala', async () => {
      const salaId = createdSalaIds[0];

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/salas/${salaId}/estado`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ estado: 'ESPERANDO_ALUMNOS' })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/v1/salas/:id/link-invitacion', () => {
    it('200 — retorna tokenInvitacion', async () => {
      const salaId = createdSalaIds[0];

      const res = await request(app.getHttpServer())
        .get(`/api/v1/salas/${salaId}/link-invitacion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        tokenInvitacion: expect.any(String),
      });
    });
  });

  describe('POST /api/v1/salas/:id/regenerar-token', () => {
    it('201 — regenera y retorna nuevo token', async () => {
      const salaId = createdSalaIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/salas/${salaId}/regenerar-token`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });
});
