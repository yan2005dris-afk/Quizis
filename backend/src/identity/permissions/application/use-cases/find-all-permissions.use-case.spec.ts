import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindAllPermissionsUseCase } from './find-all-permissions.use-case';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

describe('FindAllPermissionsUseCase', () => {
  let useCase: FindAllPermissionsUseCase;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  beforeEach(async () => {
    const mockRepo = { findAll: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllPermissionsUseCase,
        { provide: PermissionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<FindAllPermissionsUseCase>(FindAllPermissionsUseCase);
    permissionRepo = module.get(PermissionRepository);
  });

  it('should return all permissions', async () => {
    permissionRepo.findAll.mockResolvedValue([
      {
        permisoId: 1,
        nombre: 'Leer usuarios',
        descripcion: 'Consulta usuarios',
        recurso: 'Users',
        accion: 'Read',
        deletedAt: null,
      },
    ]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(permissionRepo.findAll).toHaveBeenCalled();
  });
});
