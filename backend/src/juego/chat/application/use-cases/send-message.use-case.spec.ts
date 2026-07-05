import { Test, TestingModule } from '@nestjs/testing';
import { SendMessageUseCase } from './send-message.use-case';
import { ChatCacheService } from '../../infrastructure/cache/chat-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameEvents } from '../../../../core/common/events/game-events.types';

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;

  const mockChatCache = {
    addMessage: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
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
        { provide: ChatCacheService, useValue: mockChatCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<SendMessageUseCase>(SendMessageUseCase);
    jest.clearAllMocks();
    mockChatCache.addMessage.mockResolvedValue([]);
    mockEventEmitter.emit.mockReturnValue(undefined);
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

  it('tras añadir al cache → emit CHAT.MENSAJE_ENVIADO con array actualizado', async () => {
    const msgsActualizados = [
      { usuario: 'Ana', texto: 'prev', timestamp: 1, tipo: 'mensaje' },
      { usuario: 'Juan', texto: 'Hola mundo', timestamp: 2, tipo: 'mensaje' },
    ];
    mockChatCache.addMessage.mockResolvedValue(msgsActualizados);

    await useCase.execute(basePayload);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      GameEvents.CHAT.MENSAJE_ENVIADO,
      {
        tokenCompartido: 'token-abc',
        mensajes: msgsActualizados,
      },
    );
  });
});
