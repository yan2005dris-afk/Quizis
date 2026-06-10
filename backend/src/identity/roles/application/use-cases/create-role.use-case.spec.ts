import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateRoleUseCase } from './create-role.use-case';
import { RoleRepository } from '../../domain/repositories/role.repository';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let roleRepo: jest.Mocked<RoleRepository>;

  const mockRepo = {
    create: jest.fn(),
    syncSequence: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRoleUseCase,
        { provide: RoleRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
    roleRepo = module.get(RoleRepository);
    jest.clearAllMocks();
  });

  it('should create a role without children (flat roles model)', async () => {
    const dto = { nombre: 'Admin', description: 'Admin role' };
    roleRepo.create.mockResolvedValue({
      rolId: 1,
      nombre: 'Admin',
      deletedAt: null,
    });

    const result = await useCase.execute(dto);

    expect(result).toEqual({ rolId: 1, nombre: 'Admin', deletedAt: null });
    expect(roleRepo.create).toHaveBeenCalledWith({ nombre: 'Admin' });
  });

  it('should create a role with only name (no hierarchy)', async () => {
    const dto = { nombre: 'Operador' };
    roleRepo.create.mockResolvedValue({
      rolId: 5,
      nombre: 'Operador',
      deletedAt: null,
    });

    const result = await useCase.execute(dto);

    expect(result).toEqual({
      rolId: 5,
      nombre: 'Operador',
      deletedAt: null,
    });
    expect(roleRepo.create).toHaveBeenCalledWith({ nombre: 'Operador' });
  });
});
