import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListBancosDisponiblesUseCase } from './list-bancos-disponibles.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

describe('ListBancosDisponiblesUseCase', () => {
  let useCase: ListBancosDisponiblesUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    bancoPreguntas: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBancosDisponiblesUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<ListBancosDisponiblesUseCase>(
      ListBancosDisponiblesUseCase,
    );
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería retornar la lista mapeada de bancos de preguntas activos del usuario', async () => {
    const usuarioId = 1;
    const mockBancos = [
      {
        bancoId: 1,
        nombre: 'Matemáticas',
        descripcion: 'Banco de álgebra y cálculo',
        _count: {
          preguntas: 25,
        },
      },
      {
        bancoId: 2,
        nombre: 'Física',
        descripcion: 'Banco de mecánica clásica',
        _count: {
          preguntas: 12,
        },
      },
    ];

    mockPrisma.bancoPreguntas.findMany.mockResolvedValue(mockBancos);

    const result = await useCase.execute(usuarioId);

    expect(result).toEqual([
      {
        bancoId: 1,
        nombre: 'Matemáticas',
        descripcion: 'Banco de álgebra y cálculo',
        totalPreguntas: 25,
      },
      {
        bancoId: 2,
        nombre: 'Física',
        descripcion: 'Banco de mecánica clásica',
        totalPreguntas: 12,
      },
    ]);

    expect(prisma.bancoPreguntas.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, usuarioId },
      select: {
        bancoId: true,
        nombre: true,
        descripcion: true,
        _count: {
          select: {
            preguntas: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  });
});
