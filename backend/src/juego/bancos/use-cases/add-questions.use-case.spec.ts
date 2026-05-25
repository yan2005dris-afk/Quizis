import { Test, TestingModule } from '@nestjs/testing';
import { AddQuestionsUseCase } from './add-questions.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('AddQuestionsUseCase', () => {
  let useCase: AddQuestionsUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn((promises) => Promise.all(promises)),
    preguntas: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddQuestionsUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<AddQuestionsUseCase>(AddQuestionsUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should add valid questions', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [
          { texto: 'O1', esCorrecta: true },
          { texto: 'O2', esCorrecta: false },
        ],
      },
    ];
    mockPrisma.preguntas.create.mockResolvedValue({ preguntaId: 1 });

    const result = await useCase.execute(1, preguntas);

    expect(result).toBe(1);
    expect(mockPrisma.preguntas.create).toHaveBeenCalledTimes(1);
  });

  it('should throw BadRequestException if invalid options', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [{ texto: 'O1', esCorrecta: false }],
      },
    ];

    await expect(useCase.execute(1, preguntas)).rejects.toThrow(
      BadRequestException,
    );
  });
});
