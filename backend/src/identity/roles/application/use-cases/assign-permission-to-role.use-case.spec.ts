import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AssignPermissionToRoleUseCase } from './assign-permission-to-role.use-case';
import { ConflictException } from '@nestjs/common';
import {
  RoleRepository,
  type RolePermissionAssignment,
} from '../../domain/repositories/role.repository';
import { PermissionRepository } from '../../../permissions/domain/repositories/permission.repository';

describe('AssignPermissionToRoleUseCase', () => {
  let useCase: AssignPermissionToRoleUseCase;
  let roleRepo: jest.Mocked<RoleRepository>;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  const mockRoleRepo = {
    findById: jest.fn(),
    findRolePermissionAssignment: jest.fn(),
    assignPermission: jest.fn(),
    restorePermissionAssignment: jest.fn(),
  };

  const mockPermissionRepo = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignPermissionToRoleUseCase,
        { provide: RoleRepository, useValue: mockRoleRepo },
        { provide: PermissionRepository, useValue: mockPermissionRepo },
      ],
    }).compile();

    useCase = module.get<AssignPermissionToRoleUseCase>(
      AssignPermissionToRoleUseCase,
    );
    roleRepo = module.get(RoleRepository);
    permissionRepo = module.get(PermissionRepository);
    jest.clearAllMocks();
  });

  it('should assign a permission to a role', async () => {
    roleRepo.findById.mockResolvedValue({ rolId: 1, nombre: 'Admin', deletedAt: null } as any);
    permissionRepo.findById.mockResolvedValue({
      permisoId: 10,
      nombre: 'Read',
      descripcion: '',
      recurso: 'Users',
      accion: 'Read',
      deletedAt: null,
    });
    roleRepo.findRolePermissionAssignment
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        rolPermisoId: 100,
        rolId: 1,
        permisoId: 10,
        deletedAt: null,
      } as RolePermissionAssignment);
    roleRepo.assignPermission.mockResolvedValue();

    const result = await useCase.execute(1, 10);

    expect(result).toEqual({
      rolPermisoId: 100,
      rolId: 1,
      permisoId: 10,
      deletedAt: null,
    });
    expect(roleRepo.assignPermission).toHaveBeenCalledWith(1, 10);
  });

  it('should throw ConflictException if already assigned', async () => {
    roleRepo.findById.mockResolvedValue({ rolId: 1, nombre: 'Admin', deletedAt: null } as any);
    permissionRepo.findById.mockResolvedValue({
      permisoId: 10,
      nombre: 'Read',
      descripcion: '',
      recurso: 'Users',
      accion: 'Read',
      deletedAt: null,
    });
    roleRepo.findRolePermissionAssignment.mockResolvedValue({
      rolPermisoId: 100,
      rolId: 1,
      permisoId: 10,
      deletedAt: null,
    } as RolePermissionAssignment);

    await expect(useCase.execute(1, 10)).rejects.toThrow(ConflictException);
  });

  it('should restore if previously deleted', async () => {
    roleRepo.findById.mockResolvedValue({ rolId: 1, nombre: 'Admin', deletedAt: null } as any);
    permissionRepo.findById.mockResolvedValue({
      permisoId: 10,
      nombre: 'Read',
      descripcion: '',
      recurso: 'Users',
      accion: 'Read',
      deletedAt: null,
    });
    roleRepo.findRolePermissionAssignment.mockResolvedValueOnce({
      rolPermisoId: 100,
      rolId: 1,
      permisoId: 10,
      deletedAt: new Date(),
    } as RolePermissionAssignment);
    roleRepo.restorePermissionAssignment.mockResolvedValue();
    roleRepo.findRolePermissionAssignment.mockResolvedValueOnce({
      rolPermisoId: 100,
      rolId: 1,
      permisoId: 10,
      deletedAt: null,
    } as RolePermissionAssignment);

    const result = await useCase.execute(1, 10);

    expect(result.deletedAt).toBeNull();
    expect(roleRepo.restorePermissionAssignment).toHaveBeenCalledWith(1, 10);
  });
});
