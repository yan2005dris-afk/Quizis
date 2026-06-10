import { Test, TestingModule } from '@nestjs/testing';
import { AddQuestionsUseCase } from './add-questions.use-case';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AddQuestionsUseCase', () => {
  let useCase: AddQuestionsUseCase;

  const mockPrisma = {
    $transaction: jest.fn((promises) => Promise.all(promises)),
    bancoPreguntas: {
      findUnique: jest.fn(),
    },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add valid questions if bank is owned by user', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [
          { texto: 'O1', esCorrecta: true },
          { texto: 'O2', esCorrecta: false },
        ],
      },
    ];
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 1,
    });
    mockPrisma.preguntas.create.mockResolvedValue({ preguntaId: 1 });

    const result = await useCase.execute(1, preguntas, 1);

    expect(result).toBe(1);
    expect(mockPrisma.preguntas.create).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException if bank not owned by user', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [
          { texto: 'O1', esCorrecta: true },
          { texto: 'O2', esCorrecta: false },
        ],
      },
    ];
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 2,
    });

    await expect(useCase.execute(1, preguntas, 1)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.preguntas.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if bank does not exist', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [
          { texto: 'O1', esCorrecta: true },
          { texto: 'O2', esCorrecta: false },
        ],
      },
    ];
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1, preguntas, 1)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.preguntas.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if invalid options', async () => {
    const preguntas = [
      {
        texto: 'Q1',
        opciones: [{ texto: 'O1', esCorrecta: false }],
      },
    ];

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 1,
    });

    await expect(useCase.execute(1, preguntas, 1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
