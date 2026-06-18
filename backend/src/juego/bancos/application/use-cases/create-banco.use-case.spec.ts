import { Test, TestingModule } from '@nestjs/testing';
import { CreateBancoUseCase } from './create-banco.use-case';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('CreateBancoUseCase', () => {
  let useCase: CreateBancoUseCase;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    bancoPreguntas: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    preguntas: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBancoUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<CreateBancoUseCase>(CreateBancoUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create a banco without questions', async () => {
      const dto = { nombre: 'Test Banco', descripcion: 'Test Desc' };
      const usuarioId = 1;
      const createdBanco = { bancoId: 1, ...dto };
      const returnedBanco = { ...createdBanco, _count: { preguntas: 0 } };
      mockPrisma.bancoPreguntas.create.mockResolvedValue(createdBanco);
      mockPrisma.bancoPreguntas.findUniqueOrThrow.mockResolvedValue(
        returnedBanco,
      );

      const result = await useCase.execute(usuarioId, dto as any);

      expect(result).toEqual(returnedBanco);
      expect(mockPrisma.bancoPreguntas.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          usuarioId,
        },
      });
      expect(mockPrisma.bancoPreguntas.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { bancoId: createdBanco.bancoId },
        include: {
          _count: {
            select: { preguntas: true },
          },
        },
      });
      expect(mockPrisma.preguntas.create).not.toHaveBeenCalled();
    });

    it('should create a banco with valid questions', async () => {
      const dto = {
        nombre: 'Test Banco',
        usuarioId: 1,
        preguntas: [
          {
            texto: 'Q1',
            monto: 100,
            opciones: [
              { texto: 'O1', esCorrecta: true },
              { texto: 'O2', esCorrecta: false },
            ],
          },
        ],
      };
      const usuarioId = 1;
      const createdBanco = { bancoId: 1, nombre: 'Test Banco' };
      const returnedBanco = { ...createdBanco, _count: { preguntas: 1 } };
      mockPrisma.bancoPreguntas.create.mockResolvedValue(createdBanco);
      mockPrisma.preguntas.create.mockResolvedValue({ preguntaId: 1 });
      mockPrisma.bancoPreguntas.findUniqueOrThrow.mockResolvedValue(
        returnedBanco,
      );

      const result = await useCase.execute(usuarioId, dto as any);

      expect(result).toEqual(returnedBanco);
      expect(mockPrisma.bancoPreguntas.create).toHaveBeenCalled();
      expect(mockPrisma.preguntas.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.bancoPreguntas.findUniqueOrThrow).toHaveBeenCalled();
    });

    it('should throw BadRequestException if a question has no correct option', async () => {
      const dto = {
        nombre: 'Test Banco',
        preguntas: [
          {
            texto: 'Q1',
            opciones: [
              { texto: 'O1', esCorrecta: false },
              { texto: 'O2', esCorrecta: false },
            ],
          },
        ],
      };

      await expect(useCase.execute(1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if a question has more than one correct option', async () => {
      const dto = {
        nombre: 'Test Banco',
        preguntas: [
          {
            texto: 'Q1',
            opciones: [
              { texto: 'O1', esCorrecta: true },
              { texto: 'O2', esCorrecta: true },
            ],
          },
        ],
      };

      await expect(useCase.execute(1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
