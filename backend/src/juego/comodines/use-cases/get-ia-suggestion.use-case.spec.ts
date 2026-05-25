import { Test, TestingModule } from '@nestjs/testing';
import { GetIaSuggestionUseCase } from './get-ia-suggestion.use-case';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import OpenAI from 'openai';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('GetIaSuggestionUseCase', () => {
  let useCase: GetIaSuggestionUseCase;
  let prismaService: PrismaService;
  let openAiMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIaSuggestionUseCase,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('fake-key') },
        },
        {
          provide: PrismaService,
          useValue: {
            preguntas: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<GetIaSuggestionUseCase>(GetIaSuggestionUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
    openAiMock = (useCase as any).openai;
  });

  it('debería retornar un literal y explicación si la IA responde correctamente', async () => {
    const mockPregunta = {
      preguntaId: 1,
      texto: '¿2+2?',
      opciones: [
        { opcionId: 1, texto: '3' },
        { opcionId: 2, texto: '4' },
      ],
    };

    const mockAiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              literal: 'B',
              explicacion: 'Porque 2+2 es 4',
            }),
          },
        },
      ],
    };

    jest
      .spyOn(prismaService.preguntas, 'findUnique')
      .mockResolvedValue(mockPregunta as any);
    openAiMock.chat.completions.create.mockResolvedValue(mockAiResponse);

    const result = await useCase.execute(1);

    expect(result).toEqual({ literal: 'B', explicacion: 'Porque 2+2 es 4' });
    expect(prismaService.preguntas.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { preguntaId: 1 },
      }),
    );
  });

  it('debería lanzar NotFoundException si la pregunta no existe', async () => {
    jest.spyOn(prismaService.preguntas, 'findUnique').mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(NotFoundException);
  });

  it('debería lanzar InternalServerErrorException si OpenAI falla', async () => {
    jest.spyOn(prismaService.preguntas, 'findUnique').mockResolvedValue({
      opciones: [],
    } as any);
    openAiMock.chat.completions.create.mockRejectedValue(
      new Error('OpenAI error'),
    );

    await expect(useCase.execute(1)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
