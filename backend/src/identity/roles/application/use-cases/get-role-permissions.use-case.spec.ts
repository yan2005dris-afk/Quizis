import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetRolePermissionsUseCase } from './get-role-permissions.use-case';
import { NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';

describe('GetRolePermissionsUseCase', () => {
  let useCase: GetRolePermissionsUseCase;
  let roleRepo: jest.Mocked<RoleRepository>;

  const mockRepo = {
    findOneWithPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRolePermissionsUseCase,
        { provide: RoleRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<GetRolePermissionsUseCase>(GetRolePermissionsUseCase);
    roleRepo = module.get(RoleRepository);
    jest.clearAllMocks();
  });

  it('should return permissions for a role (flat model)', async () => {
    roleRepo.findOneWithPermissions.mockResolvedValue({
      rolId: 1,
      nombre: 'Admin',
      permisos: [
        {
          rolPermisoId: 1,
          permisoId: 10,
          nombre: 'Users Read',
          descripcion: '',
          recurso: 'Users',
          accion: 'Read',
        },
        {
          rolPermisoId: 2,
          permisoId: 11,
          nombre: 'Users Write',
          descripcion: '',
          recurso: 'Users',
          accion: 'Write',
        },
      ],
    });

    const result = await useCase.execute(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      rolPermisoId: 1,
      permisoId: 10,
      recurso: 'Users',
      accion: 'Read',
    });
    expect(roleRepo.findOneWithPermissions).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundException if role does not exist', async () => {
    roleRepo.findOneWithPermissions.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
