import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetIaSuggestionUseCase } from './get-ia-suggestion.use-case';
import { InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

jest.mock('openai');

describe('GetIaSuggestionUseCase', () => {
  let useCase: GetIaSuggestionUseCase;
  let configService: ConfigService;
  let mockOpenAIInstance: any;

  beforeEach(async () => {
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIaSuggestionUseCase,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('fake-api-key'),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetIaSuggestionUseCase>(GetIaSuggestionUseCase);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return suggestion on success', async () => {
    const pregunta = 'test question';
    const suggestion = 'test suggestion';
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: suggestion } }],
    });

    const result = await useCase.execute(pregunta);

    expect(result).toEqual({ sugerencia: suggestion });
    expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en trivias académicas. Da sugerencias breves y precisas.',
        },
        { role: 'user', content: pregunta },
      ],
    });
  });

  it('should throw InternalServerErrorException on OpenAI error', async () => {
    mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('OpenAI Error'));

    await expect(useCase.execute('test')).rejects.toThrow(InternalServerErrorException);
  });
});
