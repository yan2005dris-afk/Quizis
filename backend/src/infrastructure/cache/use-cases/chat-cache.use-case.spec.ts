import { Test, TestingModule } from '@nestjs/testing';
import { ChatCacheUseCase } from './chat-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('ChatCacheUseCase', () => {
  let useCase: ChatCacheUseCase;

  const mockRedisClient = {
    rpush: jest.fn(),
    lrange: jest.fn(),
    llen: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  const mockMessage = {
    usuario: 'Juan',
    texto: 'Hola mundo',
    timestamp: 1716000000000,
    tipo: 'mensaje' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatCacheUseCase,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    useCase = module.get<ChatCacheUseCase>(ChatCacheUseCase);
    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);

    // Por defecto, no hay trim necesario (llen ≤ 200)
    mockRedisClient.rpush.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.llen.mockResolvedValue(1);
    mockRedisClient.lrange.mockResolvedValue([JSON.stringify(mockMessage)]);
  });

  afterEach(async () => {
    await useCase.onModuleDestroy();
  });

  // ─── addMessage ────────────────────────────────────────────────────────────

  describe('addMessage', () => {
    it('hace RPUSH del mensaje serializado en JSON', async () => {
      await useCase.addMessage('token-abc', mockMessage);

      expect(mockRedisClient.rpush).toHaveBeenCalledWith(
        'room:token-abc:chat',
        JSON.stringify(mockMessage),
      );
    });

    it('renueva TTL en cada mensaje (7 días)', async () => {
      await useCase.addMessage('token-abc', mockMessage);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'room:token-abc:chat',
        604800,
      );
    });

    it('hace LTRIM si excede MAX_MESSAGES (200)', async () => {
      mockRedisClient.llen.mockResolvedValue(201);
      mockRedisClient.ltrim.mockResolvedValue('OK');

      await useCase.addMessage('token-abc', mockMessage);

      expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
        'room:token-abc:chat',
        1,
        -1,
      );
    });

    it('NO hace LTRIM si no excede MAX_MESSAGES', async () => {
      mockRedisClient.llen.mockResolvedValue(100);

      await useCase.addMessage('token-abc', mockMessage);

      expect(mockRedisClient.ltrim).not.toHaveBeenCalled();
    });

    it('retorna lista actualizada de mensajes', async () => {
      const result = await useCase.addMessage('token-abc', mockMessage);

      expect(result).toEqual([mockMessage]);
    });

    it('mensaje tipo sugerencia también se almacena', async () => {
      const sugerencia = { ...mockMessage, tipo: 'sugerencia' as const };
      mockRedisClient.lrange.mockResolvedValue([JSON.stringify(sugerencia)]);

      const result = await useCase.addMessage('token-abc', sugerencia);

      expect(mockRedisClient.rpush).toHaveBeenCalledWith(
        'room:token-abc:chat',
        JSON.stringify(sugerencia),
      );
      expect(result[0].tipo).toBe('sugerencia');
    });

    it('fallback a memoria si Redis no disponible', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.addMessage('token-abc', mockMessage);

      expect(result).toContainEqual(mockMessage);
    });

    it('fallback a memoria: trim en mensaje 201', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      for (let i = 0; i < 201; i++) {
        await useCase.addMessage('token-abc', { ...mockMessage, timestamp: i });
      }

      const result = await useCase.getMessages('token-abc');
      expect(result.length).toBe(200);
    });
  });

  // ─── getMessages ───────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('recupera mensajes deserializando desde Redis (LRANGE)', async () => {
      const msgs = [
        { ...mockMessage, timestamp: 1 },
        { ...mockMessage, timestamp: 2 },
      ];
      mockRedisClient.lrange.mockResolvedValue(msgs.map(JSON.stringify));

      const result = await useCase.getMessages('token-abc');

      expect(result).toEqual(msgs);
      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        'room:token-abc:chat',
        0,
        -1,
      );
    });

    it('retorna array vacío si no hay mensajes en Redis', async () => {
      mockRedisClient.lrange.mockResolvedValue([]);

      const result = await useCase.getMessages('token-abc');

      expect(result).toEqual([]);
    });

    it('fallback a memoria: retorna array vacío si room no existe', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.getMessages('token-xyz');

      expect(result).toEqual([]);
    });
  });

  // ─── clearMessages ─────────────────────────────────────────────────────────

  describe('clearMessages', () => {
    it('elimina la clave del chat con DEL', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await useCase.clearMessages('token-abc');

      expect(mockRedisClient.del).toHaveBeenCalledWith('room:token-abc:chat');
    });

    it('fallback a memoria: borra mensajes del map interno', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addMessage('token-abc', mockMessage);
      await useCase.clearMessages('token-abc');
      const result = await useCase.getMessages('token-abc');

      expect(result).toEqual([]);
    });
  });

  // ─── lifecycle ─────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('onModuleDestroy limpia el GC interval', async () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');
      await useCase.onModuleInit();
      await useCase.onModuleDestroy();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
