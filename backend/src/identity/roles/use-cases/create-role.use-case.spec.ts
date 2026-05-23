import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateRoleUseCase } from './create-role.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    roles: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRoleUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should create a role without children (flat roles model)', async () => {
    const dto = { nombre: 'Admin', description: 'Admin role' };
    mockPrisma.roles.create.mockResolvedValue({ rolId: 1, nombre: 'Admin' });

    const result = await useCase.execute(dto);

    expect(result).toEqual({ rolId: 1, nombre: 'Admin' });
    expect(prisma.roles.create).toHaveBeenCalledWith({
      data: { nombre: 'Admin' },
    });
  });

  it('should create a role with only name (no hierarchy)', async () => {
    const dto = { nombre: 'Operador' };
    mockPrisma.roles.create.mockResolvedValue({ rolId: 5, nombre: 'Operador' });

    const result = await useCase.execute(dto);

    expect(result).toEqual({ rolId: 5, nombre: 'Operador' });
    expect(prisma.roles.create).toHaveBeenCalledWith({
      data: { nombre: 'Operador' },
    });
  });
});
