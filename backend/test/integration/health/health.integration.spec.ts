import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createFullTestApp } from '../../helpers/create-full-test-app';

describe('Health Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFullTestApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/health', () => {
    it('200 — health check retorna status ok', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});
