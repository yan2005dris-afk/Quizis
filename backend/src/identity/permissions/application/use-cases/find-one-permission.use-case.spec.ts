import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindOnePermissionUseCase } from './find-one-permission.use-case';
import { NotFoundException } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

describe('FindOnePermissionUseCase', () => {
  let useCase: FindOnePermissionUseCase;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  beforeEach(async () => {
    const mockRepo = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOnePermissionUseCase,
        { provide: PermissionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<FindOnePermissionUseCase>(FindOnePermissionUseCase);
    permissionRepo = module.get(PermissionRepository);
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
    permissionRepo.findById.mockResolvedValue(mockPermission as any);

    const result = await useCase.execute(1);

    expect(result).toEqual(mockPermission);
  });

  it('should throw NotFoundException if permission does not exist', async () => {
    permissionRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if permission is deleted', async () => {
    permissionRepo.findById.mockResolvedValue({
      permisoId: 1,
      deletedAt: new Date(),
    } as any);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
