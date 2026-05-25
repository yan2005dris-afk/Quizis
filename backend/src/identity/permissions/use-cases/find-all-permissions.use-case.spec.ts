import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindAllPermissionsUseCase } from './find-all-permissions.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('FindAllPermissionsUseCase', () => {
  let useCase: FindAllPermissionsUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    permisos: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllPermissionsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<FindAllPermissionsUseCase>(FindAllPermissionsUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return all permissions', async () => {
    mockPrisma.permisos.findMany.mockResolvedValue([
      {
        permisoId: 1,
        nombre: 'Leer usuarios',
        descripcion: 'Consulta usuarios',
        recurso: 'Users',
        accion: 'Read',
      },
    ]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(mockPrisma.permisos.findMany).toHaveBeenCalled();
  });
});
