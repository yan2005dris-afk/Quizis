import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReleaseQuestionUseCase } from './release-question.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';

describe('ReleaseQuestionUseCase', () => {
  let useCase: ReleaseQuestionUseCase;
  let cacheService: RoomStateCacheUseCase;

  const mockCacheService = {
    getQuestionStatus: jest.fn(),
    setActiveQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseQuestionUseCase,
        { provide: RoomStateCacheUseCase, useValue: mockCacheService },
      ],
    }).compile();

    useCase = module.get<ReleaseQuestionUseCase>(ReleaseQuestionUseCase);
    cacheService = module.get<RoomStateCacheUseCase>(RoomStateCacheUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if a question is already released', async () => {
    mockCacheService.getQuestionStatus.mockResolvedValue('released');

    await expect(
      useCase.execute('token-1', { preguntaId: 1 }),
    ).rejects.toThrow(BadRequestException);

    expect(mockCacheService.setActiveQuestion).not.toHaveBeenCalled();
  });

  it('should save question to cache and return success when no question is active', async () => {
    const pregunta = { preguntaId: 1, texto: '¿Cuánto es 2+2?' };
    mockCacheService.getQuestionStatus.mockResolvedValue(null);
    mockCacheService.setActiveQuestion.mockResolvedValue(undefined);

    const result = await useCase.execute('token-1', pregunta);

    expect(result).toEqual({
      success: true,
      message: 'Pregunta liberada y guardada en caché.',
    });
    expect(mockCacheService.setActiveQuestion).toHaveBeenCalledWith(
      'token-1',
      pregunta,
    );
  });
});
