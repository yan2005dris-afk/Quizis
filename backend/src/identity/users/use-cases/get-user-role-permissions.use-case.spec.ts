import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetUserRolePermissionsUseCase } from './get-user-role-permissions.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetUserRolePermissionsUseCase', () => {
  let useCase: GetUserRolePermissionsUseCase;

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
        GetUserRolePermissionsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<GetUserRolePermissionsUseCase>(
      GetUserRolePermissionsUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return role permissions for a user with active role', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: null },
    });
    mockPrisma.rolPermisos.findMany.mockResolvedValue([
      { permiso: { recurso: 'users', accion: 'read' } },
      { permiso: { recurso: 'users', accion: 'write' } },
      { permiso: { recurso: 'reports', accion: 'export' } },
    ]);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ recurso: 'users', accion: 'read' });
    expect(result).toContainEqual({ recurso: 'users', accion: 'write' });
    expect(result).toContainEqual({ recurso: 'reports', accion: 'export' });
  });

  it('should return empty array if user has no role', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: null,
    });

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
    expect(mockPrisma.rolPermisos.findMany).not.toHaveBeenCalled();
  });

  it('should return empty array if role is deleted', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: new Date() },
    });

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
    expect(mockPrisma.rolPermisos.findMany).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if user not found', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if user is deleted', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      deletedAt: new Date(),
    });

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
