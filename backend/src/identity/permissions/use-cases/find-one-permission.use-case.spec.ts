import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindOnePermissionUseCase } from './find-one-permission.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('FindOnePermissionUseCase', () => {
  let useCase: FindOnePermissionUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    permisos: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOnePermissionUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<FindOnePermissionUseCase>(FindOnePermissionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return a permission', async () => {
    const mockPermission = {
      permisoId: 1,
      nombre: 'Leer usuarios',
      descripcion: 'Consulta usuarios',
      recurso: 'Users',
      accion: 'Read',
      deletedAt: null,
    };
    mockPrisma.permisos.findUnique.mockResolvedValue(mockPermission);

    const result = await useCase.execute(1);

    expect(result).toEqual(mockPermission);
  });

  it('should throw NotFoundException if permission does not exist', async () => {
    mockPrisma.permisos.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if permission is deleted', async () => {
    mockPrisma.permisos.findUnique.mockResolvedValue({
      permisoId: 1,
      deletedAt: new Date(),
    });

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
