import { Test, TestingModule } from '@nestjs/testing';
import { RoomStateCacheUseCase } from './room-state-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('RoomStateCacheUseCase', () => {
  let useCase: RoomStateCacheUseCase;

  const mockRedisClient = {
    set: jest.fn(),
    get: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomStateCacheUseCase,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    useCase = module.get<RoomStateCacheUseCase>(RoomStateCacheUseCase);
    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
  });

  afterEach(async () => {
    await useCase.onModuleDestroy();
  });

  // ─── setRoomEstado / getRoomEstado ─────────────────────────────────────────

  describe('setRoomEstado / getRoomEstado', () => {
    it('guarda estado en Redis con TTL 86400', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setRoomEstado('token-abc', 'JUGANDO');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:estado',
        'JUGANDO',
        'EX',
        86400,
      );
    });

    it('recupera estado desde Redis', async () => {
      mockRedisClient.get.mockResolvedValue('ESPERANDO_ALUMNOS');

      const result = await useCase.getRoomEstado('token-abc');

      expect(result).toBe('ESPERANDO_ALUMNOS');
      expect(mockRedisClient.get).toHaveBeenCalledWith('room:token-abc:estado');
    });

    it('devuelve null si la clave no existe', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await useCase.getRoomEstado('token-abc');

      expect(result).toBeNull();
    });

    it('fallback a memoria si Redis falla', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.setRoomEstado('token-abc', 'FINALIZADO');
      const result = await useCase.getRoomEstado('token-abc');

      expect(result).toBe('FINALIZADO');
    });
  });

  // ─── setActiveQuestion / getActiveQuestion ─────────────────────────────────

  describe('setActiveQuestion / getActiveQuestion', () => {
    const mockQuestion = { preguntaId: 1, texto: 'P1', opciones: [] };

    it('serializa pregunta a JSON y la guarda en Redis', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setActiveQuestion('token-abc', mockQuestion);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:active-question',
        JSON.stringify(mockQuestion),
        'EX',
        3600,
      );
    });

    it('establece status a released al guardar la pregunta', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setActiveQuestion('token-abc', mockQuestion);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:status',
        'released',
        'EX',
        3600,
      );
    });

    it('parsea JSON al recuperar desde Redis', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockQuestion));

      const result = await useCase.getActiveQuestion('token-abc');

      expect(result).toEqual(mockQuestion);
    });

    it('devuelve null si no hay pregunta activa', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await useCase.getActiveQuestion('token-abc');

      expect(result).toBeNull();
    });

    it('fallback a memoria si Redis falla', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.setActiveQuestion('token-abc', mockQuestion);
      const result = await useCase.getActiveQuestion('token-abc');

      expect(result).toEqual(mockQuestion);
    });
  });

  // ─── setQuestionStatus / getQuestionStatus ─────────────────────────────────

  describe('setQuestionStatus / getQuestionStatus', () => {
    it('guarda status released en Redis', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setQuestionStatus('token-abc', 'released');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:status',
        'released',
        'EX',
        3600,
      );
    });

    it('guarda status answered en Redis', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setQuestionStatus('token-abc', 'answered');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:status',
        'answered',
        'EX',
        3600,
      );
    });

    it('recupera status desde Redis', async () => {
      mockRedisClient.get.mockResolvedValue('answered');

      const result = await useCase.getQuestionStatus('token-abc');

      expect(result).toBe('answered');
    });

    it('devuelve null si no existe', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await useCase.getQuestionStatus('token-abc');

      expect(result).toBeNull();
    });
  });

  // ─── setRoomEnabled / isRoomEnabled ────────────────────────────────────────

  describe('setRoomEnabled / isRoomEnabled', () => {
    it('guarda true como string "true" con TTL 7200', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setRoomEnabled('token-abc', true);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:enabled',
        'true',
        'EX',
        7200,
      );
    });

    it('guarda false como string "false"', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await useCase.setRoomEnabled('token-abc', false);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:token-abc:enabled',
        'false',
        'EX',
        7200,
      );
    });

    it('devuelve true si Redis retorna "true"', async () => {
      mockRedisClient.get.mockResolvedValue('true');

      const result = await useCase.isRoomEnabled('token-abc');

      expect(result).toBe(true);
    });

    it('devuelve false si Redis retorna "false"', async () => {
      mockRedisClient.get.mockResolvedValue('false');

      const result = await useCase.isRoomEnabled('token-abc');

      expect(result).toBe(false);
    });

    it('devuelve true por defecto si la clave no existe en Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await useCase.isRoomEnabled('token-abc');

      expect(result).toBe(true);
    });

    it('fallback a memoria: devuelve true por defecto si no existe', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.isRoomEnabled('token-xyz');

      expect(result).toBe(true);
    });
  });

  // ─── addBlockedComodin / getBlockedComodines ───────────────────────────────

  describe('addBlockedComodin / getBlockedComodines', () => {
    it('agrega comodin bloqueado con SADD y establece expire', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.addBlockedComodin('token-abc', '50/50');

      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'room:token-abc:comodines-bloqueados',
        '50/50',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'room:token-abc:comodines-bloqueados',
        86400,
      );
    });

    it('recupera comodines bloqueados con SMEMBERS', async () => {
      mockRedisClient.smembers.mockResolvedValue(['50/50', 'comodin-b']);

      const result = await useCase.getBlockedComodines('token-abc');

      expect(result).toEqual(['50/50', 'comodin-b']);
    });

    it('devuelve array vacío si no hay comodines bloqueados', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await useCase.getBlockedComodines('token-abc');

      expect(result).toEqual([]);
    });

    it('fallback a memoria: acumula sin duplicados', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addBlockedComodin('token-abc', '50/50');
      await useCase.addBlockedComodin('token-abc', '50/50'); // duplicado
      await useCase.addBlockedComodin('token-abc', 'comodin-b');

      const result = await useCase.getBlockedComodines('token-abc');

      expect(result).toContain('50/50');
      expect(result).toContain('comodin-b');
      expect(result.filter((c) => c === '50/50').length).toBe(1);
    });
  });

  // ─── clearRoundState ───────────────────────────────────────────────────────

  describe('clearRoundState', () => {
    it('elimina las 3 claves de estado de ronda con DEL', async () => {
      mockRedisClient.del.mockResolvedValue(3);

      await useCase.clearRoundState('token-abc');

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'room:token-abc:active-question',
        'room:token-abc:status',
        'room:token-abc:comodines-bloqueados',
      );
    });

    it('fallback a memoria: elimina las claves del map', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.setRoomEstado('token-abc', 'JUGANDO'); // guarda algo
      await useCase.clearRoundState('token-abc');

      // active-question, status, y comodines-bloqueados borrados del map interno
      // Verificamos indirectamente: getActiveQuestion → null
      const q = await useCase.getActiveQuestion('token-abc');
      expect(q).toBeNull();
    });
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('onModuleDestroy limpia el GC interval', async () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');
      await useCase.onModuleInit();
      await useCase.onModuleDestroy();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
