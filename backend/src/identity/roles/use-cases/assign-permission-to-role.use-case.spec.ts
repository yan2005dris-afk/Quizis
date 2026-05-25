import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AssignPermissionToRoleUseCase } from './assign-permission-to-role.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('AssignPermissionToRoleUseCase', () => {
  let useCase: AssignPermissionToRoleUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    roles: {
      findUnique: jest.fn(),
    },
    permisos: {
      findUnique: jest.fn(),
    },
    rolPermisos: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignPermissionToRoleUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<AssignPermissionToRoleUseCase>(
      AssignPermissionToRoleUseCase,
    );
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should assign a permission to a role', async () => {
    mockPrisma.roles.findUnique.mockResolvedValue({ rolId: 1 });
    mockPrisma.permisos.findUnique.mockResolvedValue({ permisoId: 10 });
    mockPrisma.rolPermisos.findFirst.mockResolvedValue(null);
    mockPrisma.rolPermisos.create.mockResolvedValue({
      rolPermisoId: 100,
    });

    const result = await useCase.execute(1, 10);

    expect(result).toEqual({ rolPermisoId: 100 });
    expect(prisma.rolPermisos.create).toHaveBeenCalledWith({
      data: { rolId: 1, permisoId: 10 },
    });
  });

  it('should throw ConflictException if already assigned', async () => {
    mockPrisma.roles.findUnique.mockResolvedValue({ rolId: 1 });
    mockPrisma.permisos.findUnique.mockResolvedValue({ permisoId: 10 });
    mockPrisma.rolPermisos.findFirst.mockResolvedValue({
      rolPermisoId: 100,
      deletedAt: null,
    });

    await expect(useCase.execute(1, 10)).rejects.toThrow(ConflictException);
  });

  it('should restore if previously deleted', async () => {
    mockPrisma.roles.findUnique.mockResolvedValue({ rolId: 1 });
    mockPrisma.permisos.findUnique.mockResolvedValue({ permisoId: 10 });
    mockPrisma.rolPermisos.findFirst.mockResolvedValue({
      rolPermisoId: 100,
      deletedAt: new Date(),
    });
    mockPrisma.rolPermisos.update.mockResolvedValue({
      rolPermisoId: 100,
      deletedAt: null,
    });

    const result = await useCase.execute(1, 10);

    expect(result.deletedAt).toBeNull();
    expect(prisma.rolPermisos.update).toHaveBeenCalled();
  });
});
