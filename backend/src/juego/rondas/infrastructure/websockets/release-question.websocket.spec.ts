import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReleaseQuestionWebsocket } from './release-question.websocket';
import { RoomStateCacheService } from '../../../salas/infrastructure/cache/room-state-cache.service';

describe('ReleaseQuestionWebsocket', () => {
  let websocket: ReleaseQuestionWebsocket;

  const mockCacheService = {
    getQuestionStatus: jest.fn(),
    setActiveQuestion: jest.fn(),
  };

  const mockPregunta = {
    preguntaId: 1,
    texto: 'P1',
    nivel: 'facil',
    opciones: [{ opcionId: 1, texto: 'A', esCorrecta: true }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseQuestionWebsocket,
        { provide: RoomStateCacheService, useValue: mockCacheService },
      ],
    }).compile();

    websocket = module.get<ReleaseQuestionWebsocket>(ReleaseQuestionWebsocket);
    jest.clearAllMocks();
    mockCacheService.setActiveQuestion.mockResolvedValue(undefined);
  });

  it('sin pregunta activa (status null) → pregunta guardada exitosamente', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    const result = await websocket.execute('token-abc', mockPregunta);

    expect(result.success).toBe(true);
    expect(mockCacheService.setActiveQuestion).toHaveBeenCalledWith(
      'token-abc',
      mockPregunta,
    );
  });

  it('status answered → permite liberar nueva pregunta', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('answered');

    const result = await websocket.execute('token-abc', mockPregunta);

    expect(result.success).toBe(true);
    expect(mockCacheService.setActiveQuestion).toHaveBeenCalled();
  });

  it('status released → BadRequestException (pregunta anterior sin responder)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('released');

    await expect(websocket.execute('token-abc', mockPregunta)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockCacheService.setActiveQuestion).not.toHaveBeenCalled();
  });

  it('llama setActiveQuestion con el objeto de pregunta completo', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    await websocket.execute('token-abc', mockPregunta);

    expect(mockCacheService.setActiveQuestion).toHaveBeenCalledWith(
      'token-abc',
      mockPregunta,
    );
  });
});
