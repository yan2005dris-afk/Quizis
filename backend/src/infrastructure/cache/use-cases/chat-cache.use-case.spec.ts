import { Test, TestingModule } from '@nestjs/testing';
import { ChatCacheUseCase } from './chat-cache.use-case';
import { RedisService } from '../../database/redis/redis.service';
import { ChatMessage } from '../../../juego/websockets/types/chat.types';

const makeMsg = (partial: Partial<ChatMessage> = {}): ChatMessage => ({
  usuario: 'PlayerOne',
  texto: 'Hola mundo',
  timestamp: Date.now(),
  tipo: 'mensaje',
  ...partial,
});

describe('ChatCacheUseCase', () => {
  let useCase: ChatCacheUseCase;

  const makeClient = (overrides: Record<string, jest.Mock> = {}): any => ({
    rpush: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    llen: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    ...overrides,
  });

  const build = async (client: any): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatCacheUseCase,
        {
          provide: RedisService,
          useValue: { getClient: jest.fn().mockReturnValue(client) },
        },
      ],
    }).compile();

    useCase = module.get<ChatCacheUseCase>(ChatCacheUseCase);
    await useCase.onModuleInit();
  };

  afterEach(async () => {
    await useCase?.onModuleDestroy();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('ChatCacheUseCase', () => {

    it('debe agregar un mensaje en Redis', async () => {
      const client = makeClient({
        lrange: jest.fn().mockResolvedValue([JSON.stringify(makeMsg())]),
      });

      await build(client);

      const msg = makeMsg();

      await useCase.addMessage('token-abc', msg);

      expect(client.rpush).toHaveBeenCalledWith(
        'room:token-abc:chat',
        JSON.stringify(msg),
      );
    });

    it('debe usar memoria cuando Redis falle al agregar mensajes', async () => {
      const client = makeClient({
        rpush: jest.fn().mockRejectedValue(new Error('redis error')),
      });

      await build(client);

      const msg = makeMsg();

      const result = await useCase.addMessage('token-abc', msg);

      expect(result).toContainEqual(msg);
    });

    it('debe obtener los mensajes almacenados', async () => {
      const msg1 = makeMsg({ texto: 'Primero' });
      const msg2 = makeMsg({ texto: 'Segundo' });

      const client = makeClient({
        lrange: jest.fn().mockResolvedValue([
          JSON.stringify(msg1),
          JSON.stringify(msg2),
        ]),
      });

      await build(client);

      const result = await useCase.getMessages('token-abc');

      expect(result).toEqual([msg1, msg2]);
    });

    it('debe eliminar los mensajes del chat', async () => {
      const client = makeClient();

      await build(client);

      await useCase.clearMessages('token-abc');

      expect(client.del).toHaveBeenCalledWith('room:token-abc:chat');
    });

  });
});