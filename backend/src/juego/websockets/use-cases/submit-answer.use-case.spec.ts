import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitAnswerUseCase } from './submit-answer.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { RecordAnswerUseCase } from '../../respuestas/use-cases/record-answer.use-case';

describe('SubmitAnswerUseCase', () => {
  let useCase: SubmitAnswerUseCase;

  const mockCacheService = {
    getActiveQuestion: jest.fn(),
    getQuestionStatus: jest.fn(),
    setQuestionStatus: jest.fn(),
  };

  const mockRecordAnswerUseCase = {
    execute: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const basePayload = {
    tokenCompartido: 'token-1',
    rondaId: 1,
    preguntaId: 1,
    opcionId: 5,
  };

  it('should throw BadRequestException if there is no active question', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue(null);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRecordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if active question ID does not match', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue({
      preguntaId: 99,
      opciones: [],
    });

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRecordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if question is already answered', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue({
      preguntaId: 1,
      opciones: [{ opcionId: 5, esCorrecta: true }],
    });
    mockCacheService.getQuestionStatus.mockResolvedValue('answered');

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRecordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if selected option does not belong to the question', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue({
      preguntaId: 1,
      opciones: [{ opcionId: 10, esCorrecta: true }],
    });
    mockCacheService.getQuestionStatus.mockResolvedValue(null);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockRecordAnswerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should persist answer, mark question as answered, and return correct feedback', async () => {
    mockCacheService.getActiveQuestion.mockResolvedValue({
      preguntaId: 1,
      opciones: [{ opcionId: 5, esCorrecta: true }],
      feedbackCorrecto: '¡Excelente!',
      feedbackIncorrecto: 'Incorrecto.',
    });
    mockCacheService.getQuestionStatus.mockResolvedValue(null);
    mockRecordAnswerUseCase.execute.mockResolvedValue(undefined);
    mockCacheService.setQuestionStatus.mockResolvedValue(undefined);

    const result = await useCase.execute(basePayload);

    expect(result.success).toBe(true);
    expect(result.esCorrecta).toBe(true);
    expect(result.feedback).toBe('¡Excelente!');
    expect(mockRecordAnswerUseCase.execute).toHaveBeenCalledWith({
      rondaId: 1,
      preguntaId: 1,
      opcionId: 5,
      esCorrecta: true,
      comodinUsado: null,
    });
    expect(mockCacheService.setQuestionStatus).toHaveBeenCalledWith(
      'token-1',
      'answered',
    );
  });
});
