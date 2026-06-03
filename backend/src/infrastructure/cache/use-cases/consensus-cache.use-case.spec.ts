import { Test, TestingModule } from '@nestjs/testing';
import { ConsensusCacheUseCase } from './consensus-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('ConsensusCacheUseCase', () => {
  let useCase: ConsensusCacheUseCase;

  const mockRedisClient = {
    del: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
    expire: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsensusCacheUseCase,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    useCase = module.get<ConsensusCacheUseCase>(ConsensusCacheUseCase);
    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
  });

  afterEach(async () => {
    await useCase.onModuleDestroy();
  });

  // ─── initializeRequired ────────────────────────────────────────────────────

  describe('initializeRequired', () => {
    it('elimina clave existente, hace SADD con cada nickname y establece expire', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.sadd.mockResolvedValue(2);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.initializeRequired('token-abc', 1, ['alice', 'bob']);

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
      );
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
        'alice',
        'bob',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
        3600,
      );
    });

    it('no llama SADD si nicknames está vacío', async () => {
      mockRedisClient.del.mockResolvedValue(0);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.initializeRequired('token-abc', 1, []);

      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(mockRedisClient.sadd).not.toHaveBeenCalled();
    });

    it('fallback a memoria si Redis no está disponible', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.initializeRequired('token-abc', 1, ['alice', 'bob']);

      // Verificamos indirectamente: getRequired debería retornar el Set correcto
      mockRedisService.getClient.mockReturnValue(null);
      const required = await useCase.getRequired('token-abc', 1);
      expect(required).toEqual(new Set(['alice', 'bob']));
    });

    it('fallback a memoria si Redis lanza error', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis down'));

      await useCase.initializeRequired('token-abc', 2, ['charlie']);

      mockRedisService.getClient.mockReturnValue(null);
      const required = await useCase.getRequired('token-abc', 2);
      expect(required).toEqual(new Set(['charlie']));
    });
  });

  // ─── recordVote ────────────────────────────────────────────────────────────

  describe('recordVote', () => {
    it('llama HSET con la clave correcta, nickname y opcionId como string', async () => {
      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.recordVote('token-abc', 1, 'alice', 42);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'consensus:token-abc:1:votes',
        'alice',
        '42',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'consensus:token-abc:1:votes',
        3600,
      );
    });

    it('fallback a memoria si Redis no está disponible', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.recordVote('token-abc', 1, 'alice', 42);

      const votes = await useCase.getVotes('token-abc', 1);
      expect(votes.get('alice')).toBe(42);
    });

    it('fallback a memoria si Redis lanza error', async () => {
      mockRedisClient.hset.mockRejectedValue(new Error('Redis down'));

      await useCase.recordVote('token-abc', 1, 'bob', 10);

      mockRedisService.getClient.mockReturnValue(null);
      const votes = await useCase.getVotes('token-abc', 1);
      expect(votes.get('bob')).toBe(10);
    });
  });

  // ─── getVotes ──────────────────────────────────────────────────────────────

  describe('getVotes', () => {
    it('parsea HGETALL result en Map<string, number>', async () => {
      mockRedisClient.hgetall.mockResolvedValue({ alice: '42', bob: '10' });

      const result = await useCase.getVotes('token-abc', 1);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('alice')).toBe(42);
      expect(result.get('bob')).toBe(10);
    });

    it('retorna Map vacío si Redis retorna objeto vacío', async () => {
      mockRedisClient.hgetall.mockResolvedValue({});

      const result = await useCase.getVotes('token-abc', 1);

      expect(result.size).toBe(0);
    });

    it('fallback a memoria: retorna Map vacío si no hay datos', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.getVotes('token-abc', 99);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  // ─── getRequired ───────────────────────────────────────────────────────────

  describe('getRequired', () => {
    it('parsea SMEMBERS en Set<string>', async () => {
      mockRedisClient.smembers.mockResolvedValue(['alice', 'bob']);

      const result = await useCase.getRequired('token-abc', 1);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('alice')).toBe(true);
      expect(result.has('bob')).toBe(true);
    });

    it('retorna Set vacío si no hay miembros', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await useCase.getRequired('token-abc', 1);

      expect(result.size).toBe(0);
    });

    it('fallback a memoria: retorna Set vacío si no hay datos', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const result = await useCase.getRequired('token-abc', 99);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  // ─── removeFromRequired ────────────────────────────────────────────────────

  describe('removeFromRequired', () => {
    it('llama SREM con la clave correcta y nickname', async () => {
      mockRedisClient.srem.mockResolvedValue(1);

      await useCase.removeFromRequired('token-abc', 1, 'alice');

      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
        'alice',
      );
    });

    it('fallback a memoria: elimina el nickname del Set', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.initializeRequired('token-abc', 1, ['alice', 'bob']);
      await useCase.removeFromRequired('token-abc', 1, 'alice');

      const required = await useCase.getRequired('token-abc', 1);
      expect(required.has('alice')).toBe(false);
      expect(required.has('bob')).toBe(true);
    });
  });

  // ─── addToRequired ─────────────────────────────────────────────────────────

  describe('addToRequired', () => {
    it('llama SADD con la clave correcta y nickname, y establece expire', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await useCase.addToRequired('token-abc', 1, 'alice');

      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
        'alice',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'consensus:token-abc:1:required',
        3600,
      );
    });

    it('fallback a memoria: agrega nickname al Set existente', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.initializeRequired('token-abc', 1, ['alice']);
      await useCase.addToRequired('token-abc', 1, 'bob');

      const required = await useCase.getRequired('token-abc', 1);
      expect(required.has('bob')).toBe(true);
    });

    it('fallback a memoria: crea nuevo Set si no existe', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.addToRequired('token-abc', 5, 'charlie');

      const required = await useCase.getRequired('token-abc', 5);
      expect(required.has('charlie')).toBe(true);
    });
  });

  // ─── clearConsensus ────────────────────────────────────────────────────────

  describe('clearConsensus', () => {
    it('llama DEL con ambas claves (votes y required)', async () => {
      mockRedisClient.del.mockResolvedValue(2);

      await useCase.clearConsensus('token-abc', 1);

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'consensus:token-abc:1:votes',
        'consensus:token-abc:1:required',
      );
    });

    it('fallback a memoria: elimina ambas claves del map interno', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      await useCase.initializeRequired('token-abc', 1, ['alice']);
      await useCase.recordVote('token-abc', 1, 'alice', 10);
      await useCase.clearConsensus('token-abc', 1);

      const votes = await useCase.getVotes('token-abc', 1);
      const required = await useCase.getRequired('token-abc', 1);

      expect(votes.size).toBe(0);
      expect(required.size).toBe(0);
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
