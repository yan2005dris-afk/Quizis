import { Test, TestingModule } from '@nestjs/testing';
import { ListAllSalasUseCase } from './list-all-salas.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

describe('ListAllSalasUseCase', () => {
  let useCase: ListAllSalasUseCase;

  const mockPrisma = {
    salas: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAllSalasUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<ListAllSalasUseCase>(ListAllSalasUseCase);
  });

  it('should list salas filtered by adminId', async () => {
    const adminId = 1;
    const salas = [
      {
        salaId: 1,
        nombre: 'S1',
        estado: 'abierta',
        createdAt: new Date(),
        _count: { participantes: 5 },
      },
    ];
    mockPrisma.salas.findMany.mockResolvedValue(salas);

    const result = await useCase.execute(adminId);

    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('S1');
    expect(result[0].participantes).toBe(5);
    expect(mockPrisma.salas.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, adminId },
      include: {
        _count: {
          select: { participantes: true },
        },
      },
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });
  });
});
