import { Test, TestingModule } from '@nestjs/testing';
import { SendMessageUseCase } from './send-message.use-case';
import { ChatCacheUseCase } from 'src/infrastructure/cache/use-cases/chat-cache.use-case';

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;

  const mockChatCache = {
    addMessage: jest.fn(),
  };

  const basePayload = {
    tokenCompartido: 'token-abc',
    nickname: 'Juan',
    texto: 'Hola mundo',
    tipo: 'mensaje' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendMessageUseCase,
        { provide: ChatCacheUseCase, useValue: mockChatCache },
      ],
    }).compile();

    useCase = module.get<SendMessageUseCase>(SendMessageUseCase);
    jest.clearAllMocks();
    mockChatCache.addMessage.mockResolvedValue([]);
  });

  it('mensaje tipo "mensaje" → llama addMessage con tipo correcto', async () => {
    await useCase.execute({ ...basePayload, tipo: 'mensaje' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ tipo: 'mensaje' }),
    );
  });

  it('mensaje tipo "sugerencia" → llama addMessage con tipo sugerencia', async () => {
    await useCase.execute({ ...basePayload, tipo: 'sugerencia' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ tipo: 'sugerencia' }),
    );
  });

  it('mensaje incluye: usuario, texto, timestamp y tipo', async () => {
    const before = Date.now();
    await useCase.execute(basePayload);
    const after = Date.now();

    const [[, message]] = mockChatCache.addMessage.mock.calls;
    expect(message.usuario).toBe('Juan');
    expect(message.texto).toBe('Hola mundo');
    expect(message.tipo).toBe('mensaje');
    expect(message.timestamp).toBeGreaterThanOrEqual(before);
    expect(message.timestamp).toBeLessThanOrEqual(after);
  });

  it('retorna lista de mensajes del cache', async () => {
    const msgs = [
      { usuario: 'Juan', texto: 'Hola', timestamp: 1, tipo: 'mensaje' },
    ];
    mockChatCache.addMessage.mockResolvedValue(msgs);

    const result = await useCase.execute(basePayload);

    expect(result).toEqual(msgs);
  });

  it('texto largo → almacenado completo (log trunca, storage no)', async () => {
    const largoTexto = 'X'.repeat(500);
    await useCase.execute({ ...basePayload, texto: largoTexto });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ texto: largoTexto }),
    );
  });

  it('texto vacío → almacenado sin error', async () => {
    await useCase.execute({ ...basePayload, texto: '' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ texto: '' }),
    );
  });
});
