import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReleaseQuestionUseCase } from './release-question.use-case';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

describe('ReleaseQuestionUseCase', () => {
  let useCase: ReleaseQuestionUseCase;

  const mockCacheService = {
    getQuestionStatus: jest.fn(),
    setActiveQuestion: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  /**
   * The DB returns the question with `esCorrecta` populated. The fix makes
   * this the ONLY source of truth — the client must not send it.
   */
  const mockPreguntaDb = {
    preguntaId: 1,
    bancoId: 1,
    texto: 'P1',
    nivel: 1,
    feedbackCorrecto: 'fb-correcto',
    feedbackIncorrecto: 'fb-incorrecto',
    opciones: [
      { opcionId: 1, texto: 'A', esCorrecta: false },
      { opcionId: 2, texto: 'B', esCorrecta: true },
      { opcionId: 3, texto: 'C', esCorrecta: false },
      { opcionId: 4, texto: 'D', esCorrecta: false },
    ],
  };

  const mockPrisma = {
    preguntas: {
      findFirst: jest.fn(),
    },
  };

  const preguntaAutoritativaEsperada = {
    preguntaId: 1,
    bancoId: 1,
    texto: 'P1',
    nivel: 1,
    feedbackCorrecto: 'fb-correcto',
    feedbackIncorrecto: 'fb-incorrecto',
    opciones: [
      { opcionId: 1, texto: 'A', esCorrecta: false },
      { opcionId: 2, texto: 'B', esCorrecta: true },
      { opcionId: 3, texto: 'C', esCorrecta: false },
      { opcionId: 4, texto: 'D', esCorrecta: false },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseQuestionUseCase,
        { provide: RoomStateCacheService, useValue: mockCacheService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<ReleaseQuestionUseCase>(ReleaseQuestionUseCase);
    jest.clearAllMocks();
    mockCacheService.setActiveQuestion.mockResolvedValue(undefined);
    mockPrisma.preguntas.findFirst.mockResolvedValue(mockPreguntaDb);
  });

  it('carga la pregunta desde la DB (no del body del cliente)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    await useCase.execute('token-abc', 1);

    expect(mockPrisma.preguntas.findFirst).toHaveBeenCalledWith({
      where: { preguntaId: 1, deletedAt: null },
      include: {
        opciones: {
          where: { deletedAt: null },
          orderBy: { opcionId: 'asc' },
        },
      },
    });
  });

  it('pregunta no encontrada en DB → NotFoundException', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);
    mockPrisma.preguntas.findFirst.mockResolvedValue(null);

    await expect(useCase.execute('token-abc', 999)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockCacheService.setActiveQuestion).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('pregunta sin opciones → BadRequestException', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);
    mockPrisma.preguntas.findFirst.mockResolvedValue({
      ...mockPreguntaDb,
      opciones: [],
    });

    await expect(useCase.execute('token-abc', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('pregunta cargada → cachea versión autoritativa CON esCorrecta (para que submit pueda calificar)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    await useCase.execute('token-abc', 1);

    expect(mockCacheService.setActiveQuestion).toHaveBeenCalledWith(
      'token-abc',
      preguntaAutoritativaEsperada,
    );
  });

  it('emite evento con la versión autoritativa (el gateway sanitiza antes del broadcast)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    await useCase.execute('token-abc', 1);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'rondas.pregunta_liberada',
      { tokenCompartido: 'token-abc', pregunta: preguntaAutoritativaEsperada },
    );
  });

  it('status released → BadRequestException (pregunta anterior sin responder)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('released');

    await expect(useCase.execute('token-abc', 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.preguntas.findFirst).not.toHaveBeenCalled();
    expect(mockCacheService.setActiveQuestion).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('status answered → permite liberar nueva pregunta', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('answered');

    const result = await useCase.execute('token-abc', 1);

    expect(result.success).toBe(true);
    expect(result.preguntaId).toBe(1);
    expect(mockCacheService.setActiveQuestion).toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalled();
  });

  it('CRÍTICO: el cache NUNCA contiene un esCorrecta venido del cliente (solo DB)', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue(null);
    // The DB returns the correct flag for opcion 2 = true
    mockPrisma.preguntas.findFirst.mockResolvedValue(mockPreguntaDb);

    await useCase.execute('token-abc', 1);

    const cachedQuestion = mockCacheService.setActiveQuestion.mock.calls[0][1];
    // Sanity: opcion 2 is true (loaded from DB)
    expect(cachedQuestion.opciones[1].esCorrecta).toBe(true);
    // Opcion 1 is false
    expect(cachedQuestion.opciones[0].esCorrecta).toBe(false);
    // All opcionIds are integers from the DB
    cachedQuestion.opciones.forEach((o: any) => {
      expect(typeof o.opcionId).toBe('number');
      expect(typeof o.esCorrecta).toBe('boolean');
    });
  });
});
