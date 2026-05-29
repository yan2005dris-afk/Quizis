import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitAnswerUseCase } from './submit-answer.use-case';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { RecordAnswerUseCase } from '../../respuestas/use-cases/record-answer.use-case';

describe('SubmitAnswerUseCase', () => {
  let useCase: SubmitAnswerUseCase;
  let cacheService: typeof mockCacheService;
  let recordAnswerUseCase: typeof mockRecordAnswerUseCase;

  const mockCacheService = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
    setQuestionStatus: jest.fn(),
  };

  const mockRecordAnswerUseCase = {
    execute: jest.fn(),
  };

  const mockQuestion = {
    preguntaId: 1,
    texto: 'Pregunta de prueba',
    nivel: 'facil',
    feedbackCorrecto: '¡Muy bien!',
    feedbackIncorrecto: 'Incorrecto, la respuesta era A.',
    opciones: [
      { opcionId: 10, texto: 'Opción A', esCorrecta: true },
      { opcionId: 11, texto: 'Opción B', esCorrecta: false },
      { opcionId: 12, texto: 'Opción C', esCorrecta: false },
    ],
  };

  const basePayload = {
    tokenCompartido: 'token-abc',
    rondaId: 1,
    preguntaId: 1,
    opcionId: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitAnswerUseCase,
        { provide: RoomStateCacheUseCase, useValue: mockCacheService },
        { provide: RecordAnswerUseCase, useValue: mockRecordAnswerUseCase },
      ],
    }).compile();

    useCase = module.get<SubmitAnswerUseCase>(SubmitAnswerUseCase);
    cacheService = module.get(RoomStateCacheUseCase);
    recordAnswerUseCase = module.get(RecordAnswerUseCase);
    jest.clearAllMocks();
  });

  it('respuesta correcta → esCorrecta true, feedback correcto, status → answered', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('released');
    mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
    mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);

    const result = await useCase.execute({ ...basePayload, opcionId: 10 });

    expect(result.esCorrecta).toBe(true);
    expect(result.success).toBe(true);
    expect(result.message).toContain('correcta');
    expect(result.feedback).toBe('¡Muy bien!');
    expect(cacheService.setQuestionStatus).toHaveBeenCalledWith(
      'token-abc',
      'answered',
    );
  });

  it('respuesta incorrecta → esCorrecta false, feedback incorrecto', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('released');
    mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
    mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);

    const result = await useCase.execute({ ...basePayload, opcionId: 11 });

    expect(result.esCorrecta).toBe(false);
    expect(result.feedback).toBe('Incorrecto, la respuesta era A.');
  });

  it('sin pregunta activa → BadRequestException', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(null);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('preguntaId no coincide con activa → BadRequestException', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue({
      ...mockQuestion,
      preguntaId: 999,
    });

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('status ya answered → BadRequestException', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('answered');

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('opcionId no existe en pregunta → NotFoundException', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('released');

    await expect(
      useCase.execute({ ...basePayload, opcionId: 999 }),
    ).rejects.toThrow(NotFoundException);
    expect(recordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('con comodinUsado → pasa el comodin a RecordAnswerUseCase', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('released');
    mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
    mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);

    await useCase.execute({
      ...basePayload,
      opcionId: 10,
      comodinUsado: '50/50',
    });

    expect(recordAnswerUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ comodinUsado: '50/50' }),
    );
  });

  it('persiste en DB con todos los campos correctos', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(mockQuestion);
    mockCacheService.getQuestionStatus.mockResolvedValue('released');
    mockCacheService.setQuestionStatus.mockResolvedValue(undefined);
    mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);

    await useCase.execute({ ...basePayload, opcionId: 10 });

    expect(recordAnswerUseCase.execute).toHaveBeenCalledWith({
      rondaId: 1,
      preguntaId: 1,
      opcionId: 10,
      esCorrecta: true,
      comodinUsado: null,
    });
  });
});
