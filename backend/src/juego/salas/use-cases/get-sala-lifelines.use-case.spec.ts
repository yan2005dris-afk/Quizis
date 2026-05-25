import { Test, TestingModule } from '@nestjs/testing';
import { GetSalaLifelinesUseCase } from './get-sala-lifelines.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetSalaLifelinesUseCase', () => {
  let useCase: GetSalaLifelinesUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
    },
    salaComodines: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSalaLifelinesUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<GetSalaLifelinesUseCase>(GetSalaLifelinesUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return lifelines by ID', async () => {
    mockPrisma.salaComodines.findMany.mockResolvedValue([
      { comodin: { nombre: 'C1' }, activo: true },
    ]);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('C1');
    expect(mockPrisma.salaComodines.findMany).toHaveBeenCalledWith({
      where: { salaId: 1 },
      include: expect.any(Object),
    });
  });

  it('should return lifelines by token', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({ salaId: 1 });
    mockPrisma.salaComodines.findMany.mockResolvedValue([
      { comodin: { nombre: 'C1' }, activo: true },
    ]);

    const result = await useCase.execute('TOKEN123');

    expect(result).toHaveLength(1);
    expect(mockPrisma.salas.findUnique).toHaveBeenCalledWith({
      where: { tokenCompartido: 'TOKEN123' },
      select: { salaId: true },
    });
  });

  it('should throw NotFoundException if token not found', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);
    await expect(useCase.execute('TOKEN123')).rejects.toThrow(NotFoundException);
  });
});
