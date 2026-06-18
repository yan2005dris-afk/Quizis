import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetUserRolePermissionsUseCase } from './get-user-role-permissions.use-case';
import { NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

describe('GetUserRolePermissionsUseCase', () => {
  let useCase: GetUserRolePermissionsUseCase;
  let userRepo: jest.Mocked<UserRepository>;
  let roleRepo: jest.Mocked<RoleRepository>;

  const mockUserRepo = {
    findById: jest.fn(),
  };

  const mockRoleRepo = {
    findPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserRolePermissionsUseCase,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: RoleRepository, useValue: mockRoleRepo },
      ],
    }).compile();

    useCase = module.get<GetUserRolePermissionsUseCase>(
      GetUserRolePermissionsUseCase,
    );
    userRepo = module.get(UserRepository);
    roleRepo = module.get(RoleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return role permissions for a user with active role', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: null },
    } as any);
    roleRepo.findPermissions.mockResolvedValue([
      { recurso: 'users', accion: 'read' },
      { recurso: 'users', accion: 'write' },
      { recurso: 'reports', accion: 'export' },
    ]);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ recurso: 'users', accion: 'read' });
    expect(result).toContainEqual({ recurso: 'users', accion: 'write' });
    expect(result).toContainEqual({ recurso: 'reports', accion: 'export' });
  });

  it('should return empty array if user has no role', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: null,
    } as any);

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
    expect(roleRepo.findPermissions).not.toHaveBeenCalled();
  });

  it('should return empty array if role is deleted', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: new Date() },
    } as any);

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
    expect(roleRepo.findPermissions).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if user not found', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if user is deleted', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: new Date(),
    } as any);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
