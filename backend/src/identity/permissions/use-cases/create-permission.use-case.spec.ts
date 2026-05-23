import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreatePermissionUseCase } from './create-permission.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreatePermissionUseCase', () => {
  let useCase: CreatePermissionUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    permisos: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePermissionUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<CreatePermissionUseCase>(CreatePermissionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a permission', async () => {
    const dto = {
      nombre: 'Leer usuarios',
      descripcion: 'Consulta usuarios',
      recurso: 'Users',
      accion: 'Read',
    };
    mockPrisma.permisos.create.mockResolvedValue({
      permisoId: 1,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      recurso: dto.recurso,
      accion: dto.accion,
    });

    const result = await useCase.execute(dto);

    expect(result).toEqual({
      permisoId: 1,
      nombre: 'Leer usuarios',
      descripcion: 'Consulta usuarios',
      recurso: 'Users',
      accion: 'Read',
    });
    expect(prisma.permisos.create).toHaveBeenCalledWith({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        recurso: dto.recurso,
        accion: dto.accion,
      },
    });
  });
});
