import { Test, TestingModule } from '@nestjs/testing';
import { UpdateQuestionUseCase } from './update-question.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UpdateQuestionUseCase', () => {
  let useCase: UpdateQuestionUseCase;
  let prisma: PrismaService;

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
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should update question and options', async () => {
    const dto = {
      texto: 'Updated',
      opciones: [{ texto: 'New Op', esCorrecta: true }],
    };
    mockPrisma.preguntas.findFirst.mockResolvedValue({ preguntaId: 1 });
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });

    const result = await useCase.execute(1, 1, dto as any);

    expect(mockPrisma.preguntas.update).toHaveBeenCalled();
    expect(mockPrisma.opcionesPregunta.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.opcionesPregunta.createMany).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should throw NotFoundException if question not found', async () => {
    mockPrisma.preguntas.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(1, 1, {})).rejects.toThrow(NotFoundException);
  });
});
