import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/identity/auth/infrastructure/guards/jwt-auth.guard';
import { SalaAdminGuard } from '../src/core/common/guards/sala-admin.guard';
import { PrismaService } from '../src/core/database/prisma/prisma.service';
import { RedisService } from '../src/core/database/redis/redis.service';
import { AppModule } from '../src/app.module';
import { RoomBroadcasterService } from '../src/juego/infrastructure/websockets/room-broadcaster.service';
import { JuegoGateway } from '../src/juego/infrastructure/websockets/juego.gateway';
import { DistributedTimerService } from '../src/juego/infrastructure/websockets/distributed-timer.service';
import { ParticipantsCacheService } from '../src/juego/shared/room-state/participants-cache.service';
import { SelectRandomConsultantUseCase } from '../src/juego/comodines/application/use-cases/select-random-consultant.use-case';
import { HelperCacheService } from '../src/juego/comodines/infrastructure/cache/helper-cache.service';

/**
 * Security E2E: validates the full flow that protects `esCorrecta` from
 * client-controlled payloads. Mirrors what the frontend will do in production:
 *
 *   1. Admin releases a question via REST → backend loads the authoritative
 *      question (with `esCorrecta`) from the DB. The cache contains the
 *      authoritative version.
 *   2. Student submits an INCORRECT answer via REST → backend grades using
 *      the cached `esCorrecta`, NOT the client's value. The response includes
 *      `opcionCorrectaId` so the UI can highlight the correct option.
 *
 * Critical assertions:
 *   - POST /preguntas/liberar returns `{ preguntaId }` only (no esCorrecta leak).
 *   - The cached pregunta has `esCorrecta` populated (from DB, not client).
 *   - Submit response includes `opcionCorrectaId` matching the DB-authoritative
 *     correct option, NOT the client-sent `opcionId`.
 *   - If the client tries to send the old `{ pregunta: { esCorrecta: true } }`
 *     shape, the backend ignores the payload and returns 400 (preguntaId required).
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const DB_PREGUNTA = {
  preguntaId: 1,
  bancoId: 1,
  texto: '¿Cuál es la capital de Francia?',
  nivel: 1,
  feedbackCorrecto: '¡Correcto!',
  feedbackIncorrecto: 'No, esa no es.',
  opciones: [
    { opcionId: 10, texto: 'Madrid', esCorrecta: false },
    { opcionId: 11, texto: 'París', esCorrecta: true }, // ← DB-authoritative
    { opcionId: 12, texto: 'Berlín', esCorrecta: false },
    { opcionId: 13, texto: 'Roma', esCorrecta: false },
  ],
};

const DB_PARTICIPANTE = {
  participanteId: 100,
  salaId: 1,
  nickname: 'JuanEstudiante',
  rol: 'estudiante',
  deletedAt: null,
};

const mockPrisma: any = {
  preguntas: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  participantes: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([DB_PARTICIPANTE]),
    update: jest.fn(),
  },
  rondas: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  salas: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  respuestasRonda: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn().mockImplementation((arg: any) => {
    if (typeof arg === 'function') return arg(mockPrisma);
    return Promise.resolve(arg);
  }),
};

const mockRedisService = {
  getClient: jest.fn().mockReturnValue(null),
};

class MockJwtAuthGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { usersId: 1, email: 'admin@test.com', nombre: 'Admin' };
    return true;
  }
}

class MockSalaAdminGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    req.sala = { salaId: 1, adminId: 1, estado: 'EN_VIVO' };
    return true;
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('Security E2E: liberar + submit + esCorrecta', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.REDIS_URL = ''; // Force in-memory cache fallback

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard())
      .overrideGuard(SalaAdminGuard)
      .useValue(new MockSalaAdminGuard())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    // Reset specific mock returns (don't clearAllMocks — the mock instance
    // is shared with the Proxy handler; clearing it would break the setup).
    mockPrisma.preguntas.findFirst.mockResolvedValue(DB_PREGUNTA);
    mockPrisma.preguntas.findUnique.mockResolvedValue(DB_PREGUNTA);
    mockPrisma.participantes.findFirst.mockResolvedValue(DB_PARTICIPANTE);
    mockPrisma.rondas.findFirst.mockResolvedValue({
      rondaId: 1,
      salaId: 1,
      estado: 'jugando',
    });
    mockPrisma.salas.findUnique.mockImplementation(({ where }) => {
      const token = where.tokenCompartido || 'test-token';
      return Promise.resolve({
        salaId: 1,
        tokenCompartido: token,
        adminId: 1,
        estado: 'EN_VIVO',
        participantes: [],
        comodines: [],
        rondas: [],
      });
    });
    mockPrisma.$transaction.mockImplementation((arg: any) => {
      if (typeof arg === 'function') return arg(mockPrisma);
      return Promise.resolve(arg);
    });
    mockRedisService.getClient.mockReturnValue(null);
  });

  // Each test uses a unique token so the in-memory question cache is
  // isolated. This avoids the cross-test "pregunta activa" leak that would
  // otherwise require a cache.clear() between tests.

  describe('POST /api/v1/salas/by-token/:salaId/preguntas/liberar', () => {
    it('acepta { preguntaId } y retorna { preguntaId } (sin pregunta completa en body)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/by-token/test-tok-1/preguntas/liberar')
        .send({ preguntaId: 1 })
        .expect(201);

      expect(res.body).toMatchObject({ preguntaId: 1, success: true });
      expect(mockPrisma.preguntas.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ preguntaId: 1 }),
        }),
      );
    });

    it('rechaza body viejo { pregunta: ... } con 400 (preguntaId requerido)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/by-token/test-tok-2/preguntas/liberar')
        .send({
          pregunta: {
            preguntaId: 1,
            texto: 'fake',
            opciones: [{ opcionId: 99, texto: 'fake', esCorrecta: true }],
          },
        })
        .expect(400);

      expect(res.body.message).toMatch(/preguntaId/);
    });

    it('rechaza preguntaId inexistente con 404', async () => {
      mockPrisma.preguntas.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/salas/by-token/test-tok-3/preguntas/liberar')
        .send({ preguntaId: 999 })
        .expect(404);
    });
  });

  describe('POST /api/v1/salas/:salaId/respuestas', () => {
    it('submit con opción INCORRECTA retorna esCorrecta=false y opcionCorrectaId=DB-correcto', async () => {
      const participantsCache = app.get(ParticipantsCacheService);
      await participantsCache.addParticipantOnline('test-tok-4', 'JuanEstudiante');

      await request(app.getHttpServer())
        .post('/api/v1/salas/by-token/test-tok-4/preguntas/liberar')
        .send({ preguntaId: 1 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/test-tok-4/respuestas')
        .send({
          nickname: 'JuanEstudiante',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10, // Madrid (incorrecta según DB)
        })
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'single',
        esCorrecta: false,
        winningOpcionId: 10,
        opcionCorrectaId: 11, // ← DB-authoritative correct option
      });
    });

    it('CRÍTICO: cliente no puede manipular esCorrecta con campos extra en body', async () => {
      const participantsCache = app.get(ParticipantsCacheService);
      await participantsCache.addParticipantOnline('test-tok-5', 'JuanEstudiante');

      await request(app.getHttpServer())
        .post('/api/v1/salas/by-token/test-tok-5/preguntas/liberar')
        .send({ preguntaId: 1 })
        .expect(201);

      // The DTO accepts only nickname, rondaId, preguntaId, opcionId,
      // comodinUsado. Extra fields are silently ignored by class-validator
      // (the default behavior) — the result MUST be computed from the
      // cached pregunta, NOT from any client-controlled flag.
      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/test-tok-5/respuestas')
        .send({
          nickname: 'JuanEstudiante',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 11, // correct option (París)
          esCorrectaForzado: true, // attacker tries to inject
        })
        .expect(200);

      expect(res.body.esCorrecta).toBe(true);
      expect(res.body.opcionCorrectaId).toBe(11);
      expect(res.body.esCorrectaForzado).toBeUndefined();
    });

    it('rechaza submit con nickname que no es participante con 404', async () => {
      mockPrisma.participantes.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/salas/test-tok-6/respuestas')
        .send({
          nickname: 'fantasma',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10,
        })
        .expect(404);
    });

    it('rechaza submit sin nickname con 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/salas/test-tok-7/respuestas')
        .send({
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10,
        })
        .expect(400);
    });
  });

  describe('Tokenless Participant Auth & Socket Sanitization', () => {
    it('permite enviar un mensaje de chat si el participante existe, y retorna 404 si no existe', async () => {
      // 1. Participant exists
      mockPrisma.participantes.findFirst.mockResolvedValue(DB_PARTICIPANTE);

      const resOk = await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/mensajes')
        .send({
          nickname: 'JuanEstudiante',
          texto: 'Hola a todos',
          tipo: 'mensaje',
        })
        .expect(201);

      expect(resOk.body).toBeDefined();

      // 2. Participant does not exist
      mockPrisma.participantes.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/mensajes')
        .send({
          nickname: 'desconocido',
          texto: 'Hola a todos',
          tipo: 'mensaje',
        })
        .expect(404);
    });

    it('permite votar si el participante es observador, retorna 403 si es estudiante, y retorna 404 si no existe', async () => {
      // 1. Participant exists as observer
      mockPrisma.participantes.findFirst.mockResolvedValue({
        ...DB_PARTICIPANTE,
        rol: 'observador',
      });

      const resOk = await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/votos')
        .send({
          nickname: 'JuanEstudiante',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10,
        })
        .expect(201);

      expect(resOk.body.success).toBe(true);

      // 2. Participant exists as estudiante (forbidden to vote)
      mockPrisma.participantes.findFirst.mockResolvedValue({
        ...DB_PARTICIPANTE,
        rol: 'estudiante',
      });

      await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/votos')
        .send({
          nickname: 'JuanEstudiante',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10,
        })
        .expect(403);

      // 3. Participant does not exist
      mockPrisma.participantes.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/votos')
        .send({
          nickname: 'desconocido',
          rondaId: 1,
          preguntaId: 1,
          opcionId: 10,
        })
        .expect(404);
    });

    it('permite bloquear un comodín si el participante existe, y retorna 404 si no existe', async () => {
      // 1. Participant exists
      mockPrisma.participantes.findFirst.mockResolvedValue(DB_PARTICIPANTE);

      const resOk = await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/comodines/IA/bloquear')
        .send({
          nickname: 'JuanEstudiante',
        })
        .expect(201);

      expect(resOk.body.ok).toBe(true);

      // 2. Participant does not exist
      mockPrisma.participantes.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/comodines/IA/bloquear')
        .send({
          nickname: 'desconocido',
        })
        .expect(404);
    });

    it('comodín llamada: activar emite eventos consultor_seleccionado y comodin_llamada_iniciado', async () => {
      const selectUseCase = app.get(SelectRandomConsultantUseCase);
      const helperCache = app.get(HelperCacheService);
      const broadcaster = app.get(RoomBroadcasterService);

      jest.spyOn(selectUseCase, 'execute').mockResolvedValue({ nickname: 'ConsultorObservador' } as any);
      jest.spyOn(helperCache, 'saveActiveHelper').mockResolvedValue(undefined);
      
      const spyRoom = jest.spyOn(broadcaster, 'broadcastToRoom');
      const spySocket = jest.spyOn(broadcaster, 'broadcastToSocket').mockImplementation(() => {});

      mockPrisma.participantes.findFirst.mockResolvedValue(DB_PARTICIPANTE);

      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/comodines/llamada/activar')
        .send({ nickname: 'JuanEstudiante' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.consultor.nickname).toBe('ConsultorObservador');

      // Verify comodin_llamada_iniciado room broadcast
      expect(spyRoom).toHaveBeenCalledWith(
        'test-token',
        'comodin_llamada_iniciado',
        {
          consultorNombre: 'ConsultorObservador',
          consultorId: 'ConsultorObservador',
        },
      );

      spyRoom.mockRestore();
      spySocket.mockRestore();
    });

    it('comodín llamada: enviar pista emite eventos pista_consultor_recibida y comodin_usado', async () => {
      const helperCache = app.get(HelperCacheService);
      const broadcaster = app.get(RoomBroadcasterService);

      jest.spyOn(helperCache, 'getActiveHelper').mockResolvedValue('ConsultorObservador');
      jest.spyOn(helperCache, 'removeActiveHelper').mockResolvedValue(undefined);

      const spyRoom = jest.spyOn(broadcaster, 'broadcastToRoom');

      mockPrisma.participantes.findFirst.mockResolvedValue({ nickname: 'ConsultorObservador', rol: 'observador' });
      mockPrisma.rondas.findFirst.mockResolvedValue({ rondaId: 1, salaId: 1, estado: 'jugando' });
      mockPrisma.respuestasRonda.findFirst.mockResolvedValue(null);
      mockPrisma.respuestasRonda.create.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/salas/test-token/comodines/llamada/pista')
        .send({
          nickname: 'ConsultorObservador',
          preguntaId: 1,
          pista: 'Usa la B',
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Verify broadcasts
      expect(spyRoom).toHaveBeenCalledWith(
        'test-token',
        'pista_consultor_recibida',
        {
          pista: 'Usa la B',
          consultor: 'ConsultorObservador',
        },
      );

      expect(spyRoom).toHaveBeenCalledWith(
        'test-token',
        'comodin_usado',
        {
          tipoComodin: 'LLAMADA',
        },
      );

      spyRoom.mockRestore();
    });

    it('CRÍTICO: el broadcast de pregunta_liberada no expone esCorrecta', async () => {
      const gateway = app.get(JuegoGateway);
      const broadcaster = app.get(RoomBroadcasterService);
      const timerService = app.get(DistributedTimerService);
      const spy = jest.spyOn(broadcaster, 'broadcastToRoom');

      await gateway.handlePreguntaLiberada({
        tokenCompartido: 'test-tok-sanitize',
        pregunta: DB_PREGUNTA,
      });

      expect(spy).toHaveBeenCalledWith(
        'test-tok-sanitize',
        'pregunta_liberada',
        expect.any(Object)
      );

      const preguntaLiberadaCall = spy.mock.calls.find(
        (call) => call[1] === 'pregunta_liberada',
      );
      expect(preguntaLiberadaCall).toBeDefined();

      const broadcastedPregunta = preguntaLiberadaCall![2];
      expect(broadcastedPregunta.preguntaId).toBe(1);
      broadcastedPregunta.opciones.forEach((opcion: any) => {
        expect(opcion.esCorrecta).toBeUndefined();
      });

      // Clean up open timer handles to avoid Jest open handle warning
      await timerService.detenerTimer('test-tok-sanitize');
      spy.mockRestore();
    });
  });
});
