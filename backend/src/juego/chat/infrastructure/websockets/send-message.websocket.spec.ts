import { Test, TestingModule } from '@nestjs/testing';
import { SendMessageWebsocket } from './send-message.websocket';
import { ChatCacheService } from '../cache/chat-cache.service';
import { RoomBroadcasterService } from '../../../infrastructure/websockets/room-broadcaster.service';

describe('SendMessageWebsocket', () => {
  let websocket: SendMessageWebsocket;

  const mockChatCache = {
    addMessage: jest.fn(),
  };

  const mockRoomBroadcaster = {
    broadcastToRoom: jest.fn(),
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
        SendMessageWebsocket,
        { provide: ChatCacheService, useValue: mockChatCache },
        { provide: RoomBroadcasterService, useValue: mockRoomBroadcaster },
      ],
    }).compile();

    websocket = module.get<SendMessageWebsocket>(SendMessageWebsocket);
    jest.clearAllMocks();
    mockChatCache.addMessage.mockResolvedValue([]);
    mockRoomBroadcaster.broadcastToRoom.mockReturnValue(undefined);
  });

  it('mensaje tipo "mensaje" → llama addMessage con tipo correcto', async () => {
    await websocket.execute({ ...basePayload, tipo: 'mensaje' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ tipo: 'mensaje' }),
    );
  });

  it('mensaje tipo "sugerencia" → llama addMessage con tipo sugerencia', async () => {
    await websocket.execute({ ...basePayload, tipo: 'sugerencia' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ tipo: 'sugerencia' }),
    );
  });

  it('mensaje incluye: usuario, texto, timestamp y tipo', async () => {
    const before = Date.now();
    await websocket.execute(basePayload);
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

    const result = await websocket.execute(basePayload);

    expect(result).toEqual(msgs);
  });

  it('texto largo → almacenado completo (log trunca, storage no)', async () => {
    const largoTexto = 'X'.repeat(500);
    await websocket.execute({ ...basePayload, texto: largoTexto });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ texto: largoTexto }),
    );
  });

  it('texto vacío → almacenado sin error', async () => {
    await websocket.execute({ ...basePayload, texto: '' });

    expect(mockChatCache.addMessage).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ texto: '' }),
    );
  });

  it('tras añadir al cache → broadcastea mensaje_chat a la sala con array actualizado', async () => {
    const msgsActualizados = [
      { usuario: 'Ana', texto: 'prev', timestamp: 1, tipo: 'mensaje' },
      { usuario: 'Juan', texto: 'Hola mundo', timestamp: 2, tipo: 'mensaje' },
    ];
    mockChatCache.addMessage.mockResolvedValue(msgsActualizados);

    await websocket.execute(basePayload);

    expect(mockRoomBroadcaster.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(mockRoomBroadcaster.broadcastToRoom).toHaveBeenCalledWith(
      'token-abc',
      'mensaje_chat',
      msgsActualizados,
    );
  });
});
