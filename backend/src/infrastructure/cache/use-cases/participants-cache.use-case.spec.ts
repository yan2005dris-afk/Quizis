import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsCacheUseCase } from './participants-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('ParticipantsCacheUseCase', () => {
  let useCase: ParticipantsCacheUseCase;

  const makeClient = (overrides: Record<string, jest.Mock> = {}): any => ({
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    scard: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ...overrides,
  });

  const build = async (client: any): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsCacheUseCase,
        {
          provide: RedisService,
          useValue: { getClient: jest.fn().mockReturnValue(client) },
        },
      ],
    }).compile();

    useCase = module.get<ParticipantsCacheUseCase>(ParticipantsCacheUseCase);
    await useCase.onModuleInit();
  };

  afterEach(async () => {
    await useCase?.onModuleDestroy();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('ParticipantsCacheUseCase', () => {

    it('debe agregar un participante', async () => {
      const client = makeClient();

      await build(client);

      await useCase.addParticipantOnline('token-abc', 'PlayerOne');

      expect(client.sadd).toHaveBeenCalledWith(
        'online:token-abc',
        'PlayerOne',
      );

      expect(client.sadd).toHaveBeenCalledWith(
        'history:token-abc',
        'PlayerOne',
      );
    });

    it('debe eliminar un participante', async () => {
      const client = makeClient();

      await build(client);

      await useCase.removeParticipantOnline('token-abc', 'PlayerOne');

      expect(client.srem).toHaveBeenCalledWith(
        'online:token-abc',
        'PlayerOne',
      );
    });

    it('debe obtener los participantes conectados', async () => {
      const client = makeClient({
        smembers: jest.fn().mockResolvedValue([
          'PlayerOne',
          'PlayerTwo',
        ]),
      });

      await build(client);

      const result = await useCase.getOnlineParticipants('token-abc');

      expect(result).toEqual([
        'PlayerOne',
        'PlayerTwo',
      ]);
    });

    it('debe verificar participantes duplicados', async () => {
      const client = makeClient({
        sadd: jest.fn().mockResolvedValue(1),
      });

      await build(client);

      const result = await useCase.checkAndSetDuplicate(
        'dedup:key',
        'PlayerOne',
        60,
      );

      expect(result).toBe(true);

      expect(client.expire).toHaveBeenCalledWith(
        'dedup:key',
        60,
      );
    });

    it('debe retornar false si el voto ya existe (sadd retorna 0)', async () => {
      const client = makeClient({
        sadd: jest.fn().mockResolvedValue(0),
      });

      await build(client);

      const result = await useCase.checkAndSetDuplicate(
        'dedup:key',
        'PlayerOne',
        60,
      );

      expect(result).toBe(false);
    });

    it('debe obtener los participantes históricos de la sala', async () => {
      const client = makeClient({
        smembers: jest
          .fn()
          .mockResolvedValue(['PlayerOne', 'PlayerTwo', 'Host-admin']),
      });

      await build(client);

      const result = await useCase.getHistoricalParticipants('token-abc');

      expect(result).toEqual(
        expect.arrayContaining(['PlayerOne', 'PlayerTwo', 'Host-admin']),
      );
    });

  });
});