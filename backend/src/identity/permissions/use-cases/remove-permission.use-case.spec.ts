import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { RemovePermissionUseCase } from './remove-permission.use-case';

describe('RemovePermissionUseCase', () => {
  let useCase: RemovePermissionUseCase;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemovePermissionUseCase,
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

    useCase = module.get<RemovePermissionUseCase>(RemovePermissionUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should soft delete a permission', async () => {
    const id = 1;
    const expectedResult = {
      permisoId: id,
      nombre: 'Test',
      descripcion: 'Test desc',
      recurso: 'test',
      accion: 'test',
    };
    (prismaService.permisos.update as jest.Mock).mockResolvedValue(
      expectedResult,
    );

    const result = await useCase.execute(id);

    expect(prismaService.permisos.update).toHaveBeenCalledWith({
      where: { permisoId: id },
      data: { deletedAt: expect.any(Date) },
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
