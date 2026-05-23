import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UpdatePermissionUseCase } from './update-permission.use-case';

describe('UpdatePermissionUseCase', () => {
  let useCase: UpdatePermissionUseCase;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePermissionUseCase,
        {
          provide: PrismaService,
          useValue: {
            permisos: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<UpdatePermissionUseCase>(UpdatePermissionUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update a permission', async () => {
    const id = 1;
    const dto = {
      nombre: 'Test',
      descripcion: 'Test desc',
      recurso: 'test',
      accion: 'test',
    };
    const expectedResult = {
      permisoId: id,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      recurso: dto.recurso,
      accion: dto.accion,
    };
    (prismaService.permisos.update as jest.Mock).mockResolvedValue(
      expectedResult,
    );

    const result = await useCase.execute(id, dto);

    expect(prismaService.permisos.update).toHaveBeenCalledWith({
      where: { permisoId: id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        recurso: dto.recurso,
        accion: dto.accion,
      },
      select: {
        permisoId: true,
        nombre: true,
        descripcion: true,
        recurso: true,
        accion: true,
      },
    });
    expect(result).toEqual(expectedResult);
  });
});
