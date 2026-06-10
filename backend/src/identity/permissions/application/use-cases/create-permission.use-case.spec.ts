import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreatePermissionUseCase } from './create-permission.use-case';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

describe('CreatePermissionUseCase', () => {
  let useCase: CreatePermissionUseCase;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  const mockRepo = { create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePermissionUseCase,
        { provide: PermissionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<CreatePermissionUseCase>(CreatePermissionUseCase);
    permissionRepo = module.get(PermissionRepository);
  });

  it('should create a permission', async () => {
    const dto = {
      nombre: 'Leer usuarios',
      descripcion: 'Consulta usuarios',
      recurso: 'Users',
      accion: 'Read',
    };
    permissionRepo.create.mockResolvedValue({
      permisoId: 1,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      recurso: dto.recurso,
      accion: dto.accion,
      deletedAt: null,
    } as any);

    const result = await useCase.execute(dto);

    expect(result).toEqual({
      permisoId: 1,
      nombre: 'Leer usuarios',
      descripcion: 'Consulta usuarios',
      recurso: 'Users',
      accion: 'Read',
      deletedAt: null,
    });
    expect(permissionRepo.create).toHaveBeenCalledWith(dto);
  });
});
