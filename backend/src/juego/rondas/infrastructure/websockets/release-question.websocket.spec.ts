import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReleaseQuestionWebsocket } from './release-question.websocket';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';

describe('ReleaseQuestionWebsocket', () => {
  let websocket: ReleaseQuestionWebsocket;

  const mockCacheService = {
    getQuestionStatus: jest.fn(),
    setActiveQuestion: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
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
        { provide: EventEmitter2, useValue: mockEventEmitter },
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
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'rondas.pregunta_liberada',
      { tokenCompartido: 'token-abc', pregunta: mockPregunta },
    );
  });

  it('status answered → permite liberar nueva pregunta', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('answered');

    const result = await websocket.execute('token-abc', mockPregunta);

    expect(result.success).toBe(true);
    expect(mockCacheService.setActiveQuestion).toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'rondas.pregunta_liberada',
      { tokenCompartido: 'token-abc', pregunta: mockPregunta },
    );
  });

  it('status released → BadRequestException (pregunta anterior sin responder)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('released');

    await expect(websocket.execute('token-abc', mockPregunta)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockCacheService.setActiveQuestion).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
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
