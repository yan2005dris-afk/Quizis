import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetEffectivePermissionsUseCase } from './get-effective-permissions.use-case';
import { NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

describe('GetEffectivePermissionsUseCase', () => {
  let useCase: GetEffectivePermissionsUseCase;
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
        GetEffectivePermissionsUseCase,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: RoleRepository, useValue: mockRoleRepo },
      ],
    }).compile();

    useCase = module.get<GetEffectivePermissionsUseCase>(
      GetEffectivePermissionsUseCase,
    );
    userRepo = module.get(UserRepository);
    roleRepo = module.get(RoleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return role permissions', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: { rolId: 1, deletedAt: null },
    } as any);
    roleRepo.findPermissions.mockResolvedValue([
      { recurso: 'role-perm', accion: 'read' },
    ]);

    const result = await useCase.execute(1);

    expect(result).toEqual([{ recurso: 'role-perm', accion: 'read' }]);
  });

  it('should return empty array if user has no role', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: null,
      rol: null,
    } as any);

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
  });

  it('should throw NotFoundException if user not found or deleted', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if user exists but is soft-deleted', async () => {
    userRepo.findById.mockResolvedValue({
      usuarioId: 1,
      deletedAt: new Date(),
    } as any);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
