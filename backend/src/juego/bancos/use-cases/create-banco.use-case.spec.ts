import { Test, TestingModule } from '@nestjs/testing';
import { CreateBancoUseCase } from './create-banco.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('CreateBancoUseCase', () => {
  let useCase: CreateBancoUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    bancoPreguntas: {
      create: jest.fn(),
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
    prisma = module.get<PrismaService>(PrismaService);
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
      const createdBanco = { bancoId: 1, ...dto };
      mockPrisma.bancoPreguntas.create.mockResolvedValue(createdBanco);

      const result = await useCase.execute(dto as any);

      expect(result).toEqual(createdBanco);
      expect(mockPrisma.bancoPreguntas.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
        },
      });
      expect(mockPrisma.preguntas.create).not.toHaveBeenCalled();
    });

    it('should create a banco with valid questions', async () => {
      const dto = {
        nombre: 'Test Banco',
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
      const createdBanco = { bancoId: 1, nombre: 'Test Banco' };
      mockPrisma.bancoPreguntas.create.mockResolvedValue(createdBanco);
      mockPrisma.preguntas.create.mockResolvedValue({ preguntaId: 1 });

      const result = await useCase.execute(dto as any);

      expect(result).toEqual(createdBanco);
      expect(mockPrisma.bancoPreguntas.create).toHaveBeenCalled();
      expect(mockPrisma.preguntas.create).toHaveBeenCalledTimes(1);
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

      await expect(useCase.execute(dto as any)).rejects.toThrow(
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

      await expect(useCase.execute(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
