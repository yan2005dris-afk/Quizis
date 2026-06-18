import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RemovePermissionFromRoleUseCase } from './remove-permission-from-role.use-case';
import { NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';

describe('RemovePermissionFromRoleUseCase', () => {
  let useCase: RemovePermissionFromRoleUseCase;
  let roleRepo: jest.Mocked<RoleRepository>;

  const mockRepo = {
    findRolePermissionAssignment: jest.fn(),
    removePermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemovePermissionFromRoleUseCase,
        { provide: RoleRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<RemovePermissionFromRoleUseCase>(
      RemovePermissionFromRoleUseCase,
    );
    roleRepo = module.get(RoleRepository);
    jest.clearAllMocks();
  });

  it('should remove a permission from a role', async () => {
    roleRepo.findRolePermissionAssignment.mockResolvedValue({
      rolPermisoId: 100,
      rolId: 1,
      permisoId: 10,
      deletedAt: null,
    });

    const result = await useCase.execute(1, 10);

    expect(result).toEqual({ permisoId: 10 });
    expect(roleRepo.removePermission).toHaveBeenCalledWith(1, 10);
  });

  it('should throw NotFoundException if not assigned', async () => {
    roleRepo.findRolePermissionAssignment.mockResolvedValue(null);

    await expect(useCase.execute(1, 10)).rejects.toThrow(NotFoundException);
  });
});
