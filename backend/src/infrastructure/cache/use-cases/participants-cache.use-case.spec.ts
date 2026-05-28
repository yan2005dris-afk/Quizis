import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsCacheUseCase } from './participants-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('ParticipantsCacheUseCase', () => {
  let useCase: ParticipantsCacheUseCase;

  const mockRedisClient = {
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
    expire: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsCacheUseCase,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    useCase = module.get<ParticipantsCacheUseCase>(ParticipantsCacheUseCase);
    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
  });

  afterEach(async () => {
    await useCase.onModuleDestroy();
  });

  // ─── addParticipantOnline ──────────────────────────────────────────────────

  describe('addParticipantOnline', () => {
    it('agrega nickname a online set y history set en Redis', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.addParticipantOnline('token-abc', 'Juan');

      expect(mockRedisClient.sadd).toHaveBeenCalledWith('online:token-abc', 'Juan');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith('history:token-abc', 'Juan');
    });

    it('establece TTL: 3600 para online, 14400 para history', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.addParticipantOnline('token-abc', 'Juan');

      expect(mockRedisClient.expire).toHaveBeenCalledWith('online:token-abc', 3600);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('history:token-abc', 14400);
    });

    it('fallback a memoria si Redis no disponible', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addParticipantOnline('token-abc', 'Juan');
      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result).toContain('Juan');
    });

    it('fallback a memoria: mismo nickname no duplica', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addParticipantOnline('token-abc', 'Juan');
      await useCase.addParticipantOnline('token-abc', 'Juan');
      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result.filter((n) => n === 'Juan').length).toBe(1);
    });
  });

  // ─── removeParticipantOnline ───────────────────────────────────────────────

  describe('removeParticipantOnline', () => {
    it('remueve de online set con SREM', async () => {
      mockRedisClient.srem.mockResolvedValue(1);

      await useCase.removeParticipantOnline('token-abc', 'Juan');

      expect(mockRedisClient.srem).toHaveBeenCalledWith('online:token-abc', 'Juan');
    });

    it('NO remueve del history set', async () => {
      mockRedisClient.srem.mockResolvedValue(1);

      await useCase.removeParticipantOnline('token-abc', 'Juan');

      expect(mockRedisClient.srem).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.srem).not.toHaveBeenCalledWith(
        'history:token-abc',
        'Juan',
      );
    });

    it('fallback a memoria: elimina del online set interno', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addParticipantOnline('token-abc', 'Juan');
      await useCase.removeParticipantOnline('token-abc', 'Juan');
      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result).not.toContain('Juan');
    });
  });

  // ─── getOnlineParticipants ─────────────────────────────────────────────────

  describe('getOnlineParticipants', () => {
    it('retorna lista desde Redis via SMEMBERS', async () => {
      mockRedisClient.smembers.mockResolvedValue(['Juan', 'Maria']);

      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result).toContain('Juan');
      expect(result).toContain('Maria');
    });

    it('retorna array vacío si no hay participantes', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result).toEqual([]);
    });
  });

  // ─── getHistoricalParticipants ─────────────────────────────────────────────

  describe('getHistoricalParticipants', () => {
    it('retorna todos los participantes históricos desde Redis', async () => {
      mockRedisClient.smembers.mockResolvedValue(['Juan', 'Maria', 'Carlos']);

      const result = await useCase.getHistoricalParticipants('token-abc');

      expect(result).toHaveLength(3);
      expect(result).toContain('Juan');
    });

    it('usa la clave history:{token}', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      await useCase.getHistoricalParticipants('token-abc');

      expect(mockRedisClient.smembers).toHaveBeenCalledWith('history:token-abc');
    });

    it('fallback a memoria: incluye participantes añadidos sin Redis', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addParticipantOnline('token-abc', 'Juan');
      const result = await useCase.getHistoricalParticipants('token-abc');

      expect(result).toContain('Juan');
    });
  });

  // ─── getSessionParticipantCount ────────────────────────────────────────────

  describe('getSessionParticipantCount', () => {
    it('retorna SCARD del history set', async () => {
      mockRedisClient.scard.mockResolvedValue(5);

      const result = await useCase.getSessionParticipantCount('token-abc');

      expect(result).toBe(5);
      expect(mockRedisClient.scard).toHaveBeenCalledWith('history:token-abc');
    });

    it('retorna 0 si no hay participantes', async () => {
      mockRedisClient.scard.mockResolvedValue(0);

      const result = await useCase.getSessionParticipantCount('token-abc');

      expect(result).toBe(0);
    });

    it('fallback a memoria: retorna 0 si sin historial', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.getSessionParticipantCount('token-xyz');

      expect(result).toBe(0);
    });
  });

  // ─── checkAndSetDuplicate ──────────────────────────────────────────────────

  describe('checkAndSetDuplicate', () => {
    it('SADD retorna 1 (nuevo) → true', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await useCase.checkAndSetDuplicate('dup-key', 'valor', 60);

      expect(result).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('dup-key', 60);
    });

    it('SADD retorna 0 (ya existía) → false', async () => {
      mockRedisClient.sadd.mockResolvedValue(0);

      const result = await useCase.checkAndSetDuplicate('dup-key', 'valor', 60);

      expect(result).toBe(false);
    });

    it('fallback a memoria: primer add → true, segundo → false', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const first = await useCase.checkAndSetDuplicate('dup-key', 'valor', 60);
      const second = await useCase.checkAndSetDuplicate('dup-key', 'valor', 60);

      expect(first).toBe(true);
      expect(second).toBe(false);
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
