import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { createAuthTestApp } from '../../helpers/create-auth-test-app';
import {
  TEST_AUTH_USER,
  SeededTestData,
  seedAuthTestData,
  cleanAuthTestData,
} from '../../helpers/db-test.helper';

describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeded: SeededTestData;

  beforeAll(async () => {
    app = await createAuthTestApp();
    prisma = app.get(PrismaService);
    seeded = await seedAuthTestData(prisma);
  });

  afterAll(async () => {
    if (prisma && seeded) {
      await cleanAuthTestData(prisma, seeded);
    }
    if (app) {
      await app.close();
    }
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('201 — credenciales válidas devuelven accessToken y cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_AUTH_USER.email,
          password: TEST_AUTH_USER.password,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        sid: expect.any(String),
        sub: seeded.userId,
        email: TEST_AUTH_USER.email,
      });

      const cookies = res.headers['set-cookie'] as string[] | string;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieList.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('401 — contraseña incorrecta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_AUTH_USER.email, password: 'Wrong@Password1!' })
        .expect(401);
    });

    it('401 — email no registrado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@quizis.local', password: 'Any@Pass1!' })
        .expect(401);
    });

    it('400 — body vacío falla validación', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ─── REFRESH ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('201 — login + refresh token válido en cookie rota los tokens', async () => {
      // Login para obtener cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_AUTH_USER.email,
          password: TEST_AUTH_USER.password,
        })
        .expect(201);

      const cookies = loginRes.headers['set-cookie'] as string[] | string;
      const cookieHeader = Array.isArray(cookies)
        ? cookies.join('; ')
        : cookies;

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader)
        .expect(201);

      expect(refreshRes.body).toMatchObject({
        message: 'Token refrescado correctamente',
        accessToken: expect.any(String),
      });
    });

    it('401 — sin cookie de refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('201 — login + sesión activa se cierra correctamente', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_AUTH_USER.email,
          password: TEST_AUTH_USER.password,
        })
        .expect(201);

      const cookies = loginRes.headers['set-cookie'] as string[] | string;
      const cookieHeader = Array.isArray(cookies)
        ? cookies.join('; ')
        : cookies;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader)
        .expect(201);

      expect(logoutRes.body).toMatchObject({
        message: 'Sesión cerrada correctamente',
      });

      // Cookie debe quedar vacía/expirada
      const logoutCookies = logoutRes.headers['set-cookie'] as
        | string[]
        | string;
      if (logoutCookies) {
        const list = Array.isArray(logoutCookies)
          ? logoutCookies
          : [logoutCookies];
        const refreshCookie = list.find((c) => c.startsWith('refreshToken='));
        // Si está presente, el valor debe ser vacío (cleared)
        if (refreshCookie) {
          expect(refreshCookie).toMatch(/refreshToken=;/);
        }
      }
    });

    it('401 — login + logout + refresh revocado falla', async () => {
      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_AUTH_USER.email,
          password: TEST_AUTH_USER.password,
        })
        .expect(201);

      const cookies = loginRes.headers['set-cookie'] as string[] | string;
      const cookieHeader = Array.isArray(cookies)
        ? cookies.join('; ')
        : cookies;

      // Logout — revoca la sesión
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader)
        .expect(201);

      // Intento de refresh con el mismo token → 401
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader)
        .expect(401);
    });
  });
});
