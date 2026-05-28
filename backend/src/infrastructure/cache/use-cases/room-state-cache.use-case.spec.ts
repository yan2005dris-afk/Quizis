import { Test, TestingModule } from '@nestjs/testing';
import { RoomStateCacheUseCase } from './room-state-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';

describe('RoomStateCacheUseCase', () => {
  let useCase: RoomStateCacheUseCase;

  const makeClient = (overrides: Record<string, jest.Mock> = {}): any => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    ...overrides,
  });

  const build = async (client: any): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomStateCacheUseCase,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(client),
          },
        },
      ],
    }).compile();

    useCase = module.get<RoomStateCacheUseCase>(RoomStateCacheUseCase);

    await useCase.onModuleInit();
  };

  afterEach(async () => {
    await useCase?.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('RoomStateCacheUseCase', () => {

    it('debe guardar y obtener el estado de la sala', async () => {
      const client = makeClient({
        get: jest.fn().mockResolvedValue('en_curso'),
      });

      await build(client);

      await useCase.setRoomEstado('token-abc', 'en_curso');

      const result = await useCase.getRoomEstado('token-abc');

      expect(client.set).toHaveBeenCalled();
      expect(result).toBe('en_curso');
    });

    it('debe guardar y obtener la pregunta activa', async () => {
      const question = {
        id: 1,
        texto: 'Pregunta de prueba',
        opciones: [],
      };

      const client = makeClient({
        get: jest.fn().mockResolvedValue(
          JSON.stringify(question),
        ),
      });

      await build(client);

      await useCase.setActiveQuestion(
        'token-abc',
        question,
      );

      const result = await useCase.getActiveQuestion(
        'token-abc',
      );

      expect(result).toEqual(question);
    });

    it('debe guardar el estado habilitado en Redis con TTL correcto', async () => {
      const client = makeClient();

      await build(client);

      await useCase.setRoomEnabled('token-abc', true);

      expect(client.set).toHaveBeenCalledWith(
        'room:token-abc:enabled',
        'true',
        'EX',
        7200,
      );
    });

    it('debe retornar true si la sala no tiene clave de habilitación en Redis', async () => {
      const client = makeClient({
        get: jest.fn().mockResolvedValue(null),
      });

      await build(client);

      const result = await useCase.isRoomEnabled('token-abc');

      expect(result).toBe(true);
    });

    it('debe retornar false si la sala fue deshabilitada', async () => {
      const client = makeClient({
        get: jest.fn().mockResolvedValue('false'),
      });

      await build(client);

      const result = await useCase.isRoomEnabled('token-abc');

      expect(result).toBe(false);
    });

    it('debe limpiar el estado de la ronda', async () => {
      await build(null);

      (useCase as any).memoryData.set(
        'room:token-abc:active-question',
        {
          data: {},
          expiresAt: 0,
        },
      );

      (useCase as any).memoryData.set(
        'room:token-abc:status',
        {
          data: 'released',
          expiresAt: 0,
        },
      );

      await useCase.clearRoundState('token-abc');

      expect(
        (useCase as any).memoryData.has(
          'room:token-abc:active-question',
        ),
      ).toBe(false);

      expect(
        (useCase as any).memoryData.has(
          'room:token-abc:status',
        ),
      ).toBe(false);
    });

  });
});