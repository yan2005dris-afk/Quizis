import { Test, TestingModule } from '@nestjs/testing';
import { UpdateQuestionUseCase } from './update-question.use-case';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UpdateQuestionUseCase', () => {
  let useCase: UpdateQuestionUseCase;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    preguntas: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    opcionesPregunta: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    bancoPreguntas: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateQuestionUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<UpdateQuestionUseCase>(UpdateQuestionUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update question and options if bank is owned by user', async () => {
    const dto = {
      texto: 'Updated',
      opciones: [{ texto: 'New Op', esCorrecta: true }],
    };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 1,
    });
    mockPrisma.preguntas.findFirst.mockResolvedValue({ preguntaId: 1 });

    const result = await useCase.execute(1, 1, dto as any, 1);

    expect(mockPrisma.preguntas.update).toHaveBeenCalled();
    expect(mockPrisma.opcionesPregunta.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.opcionesPregunta.createMany).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should throw NotFoundException if question not found', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 1,
    });
    mockPrisma.preguntas.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(1, 1, {}, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if bank not owned by user', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({
      bancoId: 1,
      usuarioId: 2,
    });

    await expect(useCase.execute(1, 1, {} as any, 1)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.preguntas.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if bank does not exist', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1, 1, {} as any, 1)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.preguntas.update).not.toHaveBeenCalled();
  });
});
