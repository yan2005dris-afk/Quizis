import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetRolePermissionsUseCase } from './get-role-permissions.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetRolePermissionsUseCase', () => {
  let useCase: GetRolePermissionsUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    roles: {
      findUnique: jest.fn(),
    },
    rolPermisos: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRolePermissionsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<GetRolePermissionsUseCase>(GetRolePermissionsUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should return permissions for a role (flat model)', async () => {
    mockPrisma.roles.findUnique.mockResolvedValue({ rolId: 1 });
    mockPrisma.rolPermisos.findMany.mockResolvedValue([
      {
        rolPermisoId: 1,
        permisoId: 10,
        permiso: { permisoId: 10, recurso: 'Users', accion: 'Read' },
      },
      {
        rolPermisoId: 2,
        permisoId: 11,
        permiso: { permisoId: 11, recurso: 'Users', accion: 'Write' },
      },
    ]);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      rolPermisoId: 1,
      permisoId: 10,
      recurso: 'Users',
      accion: 'Read',
    });
    expect(prisma.roles.findUnique).toHaveBeenCalled();
  });

  it('should throw NotFoundException if role does not exist', async () => {
    mockPrisma.roles.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
