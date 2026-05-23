import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetEffectivePermissionsUseCase } from './get-effective-permissions.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetEffectivePermissionsUseCase', () => {
  let useCase: GetEffectivePermissionsUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    usuarios: {
      findUnique: jest.fn(),
    },
    rolPermisos: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetEffectivePermissionsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<GetEffectivePermissionsUseCase>(
      GetEffectivePermissionsUseCase,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return role permissions', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: null },
    });
    mockPrisma.rolPermisos.findMany.mockResolvedValue([
      { permiso: { recurso: 'role-perm', accion: 'read' } },
    ]);

    const result = await useCase.execute(1);

    expect(result).toEqual([{ recurso: 'role-perm', accion: 'read' }]);
  });

  it('should return empty array if user has no role', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: null,
    });

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
  });

  it('should throw NotFoundException if user not found or deleted', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
